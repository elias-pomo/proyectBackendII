// src/dao/TicketsDAO.js
import mongoose from 'mongoose';
import { ticketModel } from './models/ticket.model.js';
import { ACTIVE_TICKET_STATUSES } from '../constants/statuses.js';

export class TicketsDAO {
    async create(data, session) {
        const [ticket] = await ticketModel.create([data], { session });   // con sesión, create exige un arreglo
        return ticket.toJSON();
    }

    async findById(id) {
        return await ticketModel.findById(id).lean();
    }

    async findByIdWithRefs(id) {
        return await ticketModel.findById(id)
            .populate('user', 'first_name email')
            .populate('event', 'title date location')
            .lean();
    }

    async findActiveByUserAndEvent(userId, eventId, session) {
        return await ticketModel.findOne(
            { user: userId, event: eventId, status: { $in: ACTIVE_TICKET_STATUSES } },
            null,
            { session }
        ).lean();
    }

    // Lugares ocupados: suma de quantity de los tickets activos (los cancelled no cuentan)
    async countActiveSeats(eventId, session) {
        const [result] = await ticketModel.aggregate([
            { $match: { event: new mongoose.Types.ObjectId(String(eventId)), status: { $in: ACTIVE_TICKET_STATUSES } } },
            { $group: { _id: null, total: { $sum: '$quantity' } } }
        ], { session });
        return result?.total ?? 0;
    }

    async findByUser(userId) {
        return await ticketModel.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate('event', 'title date endDate location status')
            .lean();
    }

    async findByEvent(eventId) {
        return await ticketModel.find({ event: eventId })
            .sort({ createdAt: -1 })
            .populate('user', 'first_name last_name email')
            .lean();
    }

    // Atómico: solo cancela si sigue activo. Devuelve null si otro pedido lo canceló primero
    async cancel(id) {
        return await ticketModel.findOneAndUpdate(
            { _id: id, status: { $in: ACTIVE_TICKET_STATUSES } },
            { status: 'cancelled', cancelledAt: new Date() },
            { returnDocument: 'after', runValidators: true }
        ).lean();
    }
}