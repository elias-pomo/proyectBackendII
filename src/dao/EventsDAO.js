import { eventModel } from "./models/event.model.js";

export class EventsDAO {
    async get(filtro = {}) {
        return await eventModel.find(filtro).lean();
    }
    async getById(id) {
        return await eventModel.findById(id).lean();
    }
    async create(event = {}) {
        const newEvent = await eventModel.create(event);
        return newEvent.toJSON();
    }
    async delete(id){
        return await enventModel.findByIdAndDelete(id).lean();
    }
    async update(id, data) {
        return await eventModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    }
}