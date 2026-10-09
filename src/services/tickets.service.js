import { randomBytes } from 'node:crypto';
import { AppError } from '../utils/AppError.js';

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
    constructor(ticketsDAO, eventsDAO, mailService, categoriesDAO) {
        this.ticketsDAO = ticketsDAO;
        this.eventsDAO = eventsDAO;
        this.mailService = mailService;
        this.categoriesDAO = categoriesDAO;
    }

    async createTicket(eventId, body, user) {
        const event = await this.eventsDAO.getById(eventId);   // un id mal formado llega al errorHandler como CastError (400)
        if (!event) throw new AppError('Evento no encontrado', 404);

        if (event.status === 'cancelled') throw new AppError('El evento fue cancelado y no admite inscripciones', 409);
        if (event.status === 'finished') throw new AppError('El evento ya finalizó y no admite inscripciones', 409);
        if (event.status !== 'published') throw new AppError('El evento todavía no está publicado', 409);
        if (event.date <= new Date()) throw new AppError('La clase ya comenzó y no admite inscripciones', 409);

        const quantity = parseQuantity(body?.quantity);
        const category = await this.categoriesDAO.getById(event.category);
const maxQuantity = category?.maxQuantityPerTicket ?? null;   // null: sin límite
if (maxQuantity !== null && quantity > maxQuantity) {
    throw new AppError(
        `${category.name} permite reservar como máximo ${maxQuantity === 1 ? '1 lugar' : `${maxQuantity} lugares`} por inscripción`,
        400
    );
}

        const existing = await this.ticketsDAO.findActiveByUserAndEvent(user._id, event._id);
        if (existing) throw new AppError('Ya tenés una inscripción activa para este evento', 409);

        const taken = await this.ticketsDAO.countActiveSeats(event._id);
        const available = Math.max(event.capacity - taken, 0);
        if (quantity > available) {
            throw new AppError(
                available === 0
                    ? 'No hay cupos disponibles para este evento'
                    : `No hay cupo suficiente: ${available === 1 ? 'queda 1 lugar' : `quedan ${available} lugares`} y pediste ${quantity}`,
                409
            );
        }

        const ticket = await this.ticketsDAO.create({
            user: user._id,
            event: event._id,
            quantity,
            status: 'confirmed',
            reservationCode: generateReservationCode()
        });

        // El email no bloquea la respuesta ni la rompe si falla
        this.mailService
            .sendTicketConfirmation({ to: user.email, name: user.first_name, event, ticket })
            .catch((error) => console.error(`No se pudo enviar el email de ${ticket.reservationCode}:`, error.message));

        return ticket;
    }

    async getMyTickets(user) {
        return await this.ticketsDAO.getByUser(user._id);
    }

    // Organizer dueño del evento o admin
    async getEventTickets(eventId, user) {
        const event = await this.eventsDAO.getById(eventId);
        if (!event) throw new AppError('Evento no encontrado', 404);

        if (user.role !== 'admin' && String(event.organizer) !== String(user._id)) {
            throw new AppError('No tenés permisos para ver las inscripciones de este evento', 403);
        }

        const tickets = await this.ticketsDAO.getByEvent(event._id);
        const taken = await this.ticketsDAO.countActiveSeats(event._id);

        return {
            tickets,
            summary: { capacity: event.capacity, taken, available: Math.max(event.capacity - taken, 0) }
        };
    }

    // Dueño del ticket o admin; no se borra, se marca cancelled
    async cancelTicket(ticketId, user) {
    const ticket = await this.ticketsDAO.getById(ticketId);
    if (!ticket) throw new AppError('Ticket no encontrado', 404);

    if (user.role !== 'admin' && String(ticket.user) !== String(user._id)) {
        throw new AppError('No tenés permisos para cancelar este ticket', 403);
    }
    if (ticket.status === 'cancelled') throw new AppError('El ticket ya está cancelado', 409);

    const cancelled = await this.ticketsDAO.cancel(ticket._id);

    // Si llegó hasta acá sin ser el dueño, es un admin cancelando el ticket de otra persona
    const cancelledByAdmin = String(ticket.user) !== String(user._id);
    this.#notifyCancellation(ticket._id, cancelledByAdmin);   // sin await: no demora ni rompe la respuesta

    return cancelled;
}

// El aviso siempre le llega al dueño del ticket, no a quien hizo la request
async #notifyCancellation(ticketId, cancelledByAdmin) {
    try {
        const ticket = await this.ticketsDAO.getByIdWithRefs(ticketId);
        if (!ticket?.user?.email || !ticket.event) return;

        await this.mailService.sendTicketCancellation({
            to: ticket.user.email,
            name: ticket.user.first_name,
            event: ticket.event,
            ticket,
            cancelledByAdmin
        });
    } catch (error) {
        console.error(`No se pudo enviar el email de cancelación (${ticketId}):`, error.message);
    }
}
}