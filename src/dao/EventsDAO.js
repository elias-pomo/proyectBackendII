import { eventModel } from "./models/event.model";

export class EventsDAO{
    async get(filtro={}){
        return await eventModel.find().lean()
    }
    async create(event={}){
        const newEvent=await eventModel.create(event)
        return newEvent.toJSON()
    }
}