import { randomBytes } from 'node:crypto';
import { AppError } from '../utils/AppError.js';
import { runInTransaction } from '../utils/transaction.js';
import { logger } from '../utils/logger.js';

const generateReservationCode = () => `RES-${randomBytes(4).toString('hex').toUpperCase()}`;

const parseQuantity = (value) => {
    if (value === undefined) return 1;
    const n = typeof value === 'number' ? value
        : typeof value === 'string' && value.trim() !== '' ? Number(value)
        : NaN;
    if (!Number.isInteger(n) || n < 1) throw new AppError('quantity debe ser un número entero mayor a 0', 400);
    return n;
};

export class TicketsService {
    constructor(ticketRepository, eventRepository, categoryRepository, mailService) {
        this.ticketRepository = ticketRepository;
        this.eventRepository = eventRepository;
        this.categoryRepository = categoryRepository;
        this.mailService = mailService;
    }

    async createTicket(eventId, body, user) {
        const booking = await runInTransaction(async (session) => {
            // Candado: toca el evento y lo lee ya bloqueado; lo demás se decide con datos consistentes
            const event = await this.eventRepository.lockForBooking(eventId, session);   // id mal formado: CastError (400)
            if (!event) throw new AppError('Evento no encontrado', 404);

            if (event.status === 'cancelled') throw new AppError('El evento fue cancelado y no admite inscripciones', 409);
            if (event.status === 'finished') throw new AppError('El evento ya finalizó y no admite inscripciones', 409);
            if (event.status !== 'published') throw new AppError('El evento todavía no está publicado', 409);
            if (event.date <= new Date()) throw new AppError('La clase ya comenzó y no admite inscripciones', 409);

            const quantity = parseQuantity(body?.quantity);

            const category = await this.categoryRepository.findById(event.category);
            const maxQuantity = category?.maxQuantityPerTicket ?? null;   // null: sin límite
            if (maxQuantity !== null && quantity > maxQuantity) {
                throw new AppError(
                    `${category.name} permite reservar como máximo ${maxQuantity === 1 ? '1 lugar' : `${maxQuantity} lugares`} por inscripción`,
                    400
                );
            }

            const existing = await this.ticketRepository.findActiveByUserAndEvent(user._id, event._id, session);
            if (existing) throw new AppError('Ya tenés una inscripción activa para este evento', 409);

            const taken = await this.ticketRepository.countActiveSeats(event._id, session);
            const available = Math.max(event.capacity - taken, 0);
            if (quantity > available) {
                throw new AppError(
                    available === 0
                        ? 'No hay cupos disponibles para este evento'
                        : `No hay cupo suficiente: ${available === 1 ? 'queda 1 lugar' : `quedan ${available} lugares`} y pediste ${quantity}`,
                    409
                );
            }

            const ticket = await this.ticketRepository.create({
                user: user._id,
                event: event._id,
                quantity,
                status: 'confirmed',
                reservationCode: generateReservationCode()
            }, session);

            return { ticket, event };
        });

        // El email va DESPUÉS de confirmar la transacción: adentro podría ejecutarse más de una vez por un reintento
        this.mailService
            .sendTicketConfirmation({ to: user.email, name: user.first_name, event: booking.event, ticket: booking.ticket })
            .catch((error) => logger.error(`No se pudo enviar el email de ${booking.ticket.reservationCode}`, error));

        return booking.ticket;
    }

    async getMyTickets(user) {
        return await this.ticketRepository.findByUser(user._id);
    }

    // Organizer dueño del evento o admin
    async getEventTickets(eventId, user) {
        const event = await this.eventRepository.findById(eventId);
        if (!event) throw new AppError('Evento no encontrado', 404);

        if (user.role !== 'admin' && String(event.organizer) !== String(user._id)) {
            throw new AppError('No tenés permisos para ver las inscripciones de este evento', 403);
        }

        const tickets = await this.ticketRepository.findByEvent(event._id);
        const taken = await this.ticketRepository.countActiveSeats(event._id);

        return {
            tickets,
            summary: { capacity: event.capacity, taken, available: Math.max(event.capacity - taken, 0) }
        };
    }

    // Dueño del ticket o admin; no se borra, se marca cancelled
    async cancelTicket(ticketId, user) {
        const ticket = await this.ticketRepository.findById(ticketId);
        if (!ticket) throw new AppError('Ticket no encontrado', 404);

        if (user.role !== 'admin' && String(ticket.user) !== String(user._id)) {
            throw new AppError('No tenés permisos para cancelar este ticket', 403);
        }
        if (ticket.status === 'cancelled') throw new AppError('El ticket ya está cancelado', 409);

        const cancelled = await this.ticketRepository.cancelTicket(ticket._id);
        if (!cancelled) throw new AppError('El ticket ya está cancelado', 409);   // otro pedido lo canceló primero

        // Si llegó hasta acá sin ser el dueño, es un admin cancelando el ticket de otra persona
        const cancelledByAdmin = String(ticket.user) !== String(user._id);
        this.#notifyCancellation(ticket._id, cancelledByAdmin);   // sin await: no demora ni rompe la respuesta

        return cancelled;
    }

    // El aviso siempre le llega al dueño del ticket, no a quien hizo la request
    async #notifyCancellation(ticketId, cancelledByAdmin) {
        try {
            const ticket = await this.ticketRepository.findByIdWithRelations(ticketId);
            if (!ticket?.user?.email || !ticket.event) return;

            await this.mailService.sendTicketCancellation({
                to: ticket.user.email,
                name: ticket.user.first_name,
                event: ticket.event,
                ticket,
                cancelledByAdmin
            });
        } catch (error) {
            logger.error(`No se pudo enviar el email de cancelación (${ticketId})`, error);
        }
    }
}