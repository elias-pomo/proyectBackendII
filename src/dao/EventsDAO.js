import { eventModel } from "./models/event.model.js";

export class EventsDAO {
    async paginate(filter, { sortField, sortDir, page, limit }) {
    const [data, total] = await Promise.all([
        eventModel.find(filter)
            .sort({ [sortField]: sortDir, _id: 1 })   // _id desempata y mantiene estable la paginación
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('category', 'name color')
            .populate('organizer', 'first_name last_name')
            .lean(),
        eventModel.countDocuments(filter)
    ]);
    return { data, total };
}

async getByIdPopulated(id) {
    return await eventModel.findById(id)
        .populate('category', 'name color')
        .populate('organizer', 'first_name last_name')
        .lean();
}
    async getById(id) {
        return await eventModel.findById(id).lean();
    }
    async create(event = {}) {
        const newEvent = await eventModel.create(event);
        return newEvent.toJSON();
    }
    
    async update(id, data) {
        return await eventModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    }
}