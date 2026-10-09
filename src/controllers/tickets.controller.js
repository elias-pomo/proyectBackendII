import { runInTransaction } from '../utils/transaction.js';

export class TicketsController {
    constructor(ticketsService) {
        this.ticketsService = ticketsService;
    }

    async createTicket(eventId, body, user) {
    const booking = await runInTransaction(async (session) => {
        // 1. Candado: toca el evento y lo lee ya bloqueado. Todo lo demás se decide con datos consistentes.
        const event = await this.eventsDAO.lockForBooking(eventId, session);   // un id mal formado llega como CastError (400)
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

        const existing = await this.ticketsDAO.findActiveByUserAndEvent(user._id, event._id, session);
        if (existing) throw new AppError('Ya tenés una inscripción activa para este evento', 409);

        const taken = await this.ticketsDAO.countActiveSeats(event._id, session);
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
        }, session);

        return { ticket, event };
    });

    // El email va DESPUÉS de confirmar la transacción: adentro podría ejecutarse más de una vez por un reintento
    this.mailService
        .sendTicketConfirmation({ to: user.email, name: user.first_name, event: booking.event, ticket: booking.ticket })
        .catch((error) => console.error(`No se pudo enviar el email de ${booking.ticket.reservationCode}:`, error.message));

    return booking.ticket;
}

    getMyTickets = async (req, res, next) => {
        try {
            const tickets = await this.ticketsService.getMyTickets(req.user);
            return res.status(200).json({ status: 'success', payload: tickets });
        } catch (error) {
            next(error);
        }
    }

    getEventTickets = async (req, res, next) => {
        try {
            const { tickets, summary } = await this.ticketsService.getEventTickets(req.params.eid, req.user);
            return res.status(200).json({ status: 'success', payload: tickets, summary });
        } catch (error) {
            next(error);
        }
    }

    cancelTicket = async (req, res, next) => {
        try {
            const ticket = await this.ticketsService.cancelTicket(req.params.tid, req.user);
            if (!cancelled) throw new AppError('El ticket ya está cancelado', 409);   // otro pedido lo canceló primero
            return res.status(200).json({ status: 'success', payload: ticket });
        } catch (error) {
            next(error);
        }
    }
}