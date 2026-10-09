import mongoose from 'mongoose';
import { ticketModel, ACTIVE_TICKET_STATUSES } from './models/ticket.model.js';

export class TicketsDAO {
    async create(data) {
        const ticket = await ticketModel.create(data);
        return ticket.toJSON();
    }

    async getById(id) {
        return await ticketModel.findById(id).lean();
    }

    async findActiveByUserAndEvent(userId, eventId) {
        return await ticketModel.findOne({
            user: userId,
            event: eventId,
            status: { $in: ACTIVE_TICKET_STATUSES }
        }).lean();
    }

    // Lugares ocupados: suma de quantity de los tickets activos (los cancelled no cuentan)
    async countActiveSeats(eventId) {
        const [result] = await ticketModel.aggregate([
            { $match: { event: new mongoose.Types.ObjectId(String(eventId)), status: { $in: ACTIVE_TICKET_STATUSES } } },
            { $group: { _id: null, total: { $sum: '$quantity' } } }
        ]);
        return result?.total ?? 0;
    }

    async getByUser(userId) {
        return await ticketModel.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate('event', 'title date endDate location status')
            .lean();
    }

    async getByEvent(eventId) {
        return await ticketModel.find({ event: eventId })
            .sort({ createdAt: -1 })
            .populate('user', 'first_name last_name email')
            .lean();
    }

    async cancel(id) {
        return await ticketModel.findByIdAndUpdate(
            id,
            { status: 'cancelled', cancelledAt: new Date() },
            { new: true, runValidators: true }
        ).lean();
    }
    async getByIdWithRefs(id) {
    return await ticketModel.findById(id)
        .populate('user', 'first_name email')
        .populate('event', 'title date location')
        .lean();
}
async create(data, session) {
    const [ticket] = await ticketModel.create([data], { session });   // con sesión, create exige un arreglo
    return ticket.toJSON();
}

async findActiveByUserAndEvent(userId, eventId, session) {
    return await ticketModel.findOne(
        { user: userId, event: eventId, status: { $in: ACTIVE_TICKET_STATUSES } },
        null,
        { session }
    ).lean();
}

async countActiveSeats(eventId, session) {
    const [result] = await ticketModel.aggregate([
        { $match: { event: new mongoose.Types.ObjectId(String(eventId)), status: { $in: ACTIVE_TICKET_STATUSES } } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
    ], { session });
    return result?.total ?? 0;
}

// Atómico: solo cancela si sigue activo. Devuelve null si otro pedido lo canceló primero
async cancel(id) {
    return await ticketModel.findOneAndUpdate(
        { _id: id, status: { $in: ACTIVE_TICKET_STATUSES } },
        { status: 'cancelled', cancelledAt: new Date() },
        { new: true, runValidators: true }
    ).lean();
}
}