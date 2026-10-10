import { eventModel } from './models/event.model.js';

const CATEGORY_FIELDS = 'name color maxQuantityPerTicket';
const ORGANIZER_FIELDS = 'first_name last_name';

export class EventsDAO {
    async paginate(filter, { sortField, sortDir, page, limit }) {
        const [data, total] = await Promise.all([
            eventModel.find(filter)
                .sort({ [sortField]: sortDir, _id: 1 })   // _id desempata y mantiene estable la paginación
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('category', CATEGORY_FIELDS)
                .populate('organizer', ORGANIZER_FIELDS)
                .lean(),
            eventModel.countDocuments(filter)
        ]);
        return { data, total };
    }

    async findByIdPopulated(id) {
        return await eventModel.findById(id)
            .populate('category', CATEGORY_FIELDS)
            .populate('organizer', ORGANIZER_FIELDS)
            .lean();
    }

    async findById(id) {
        return await eventModel.findById(id).lean();
    }

    async create(data) {
        const event = await eventModel.create(data);
        return event.toJSON();
    }

    async update(id, data) {
        return await eventModel.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true }).lean();
    }

    async count(filter = {}) {
        return await eventModel.countDocuments(filter);
    }

    // Candado de reserva: incrementa bookingVersion para serializar las inscripciones concurrentes
    async lockForBooking(id, session) {
        return await eventModel.findOneAndUpdate(
            { _id: id },
            { $inc: { bookingVersion: 1 } },
            { returnDocument: 'after', session, timestamps: false }   // timestamps: false para no tocar updatedAt
        ).lean();
    }
}