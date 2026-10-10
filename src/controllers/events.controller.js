// src/controllers/events.controller.js
import { toEventDTO } from '../dto/event.dto.js';

export class EventsController {
    constructor(eventsService) {
        this.eventsService = eventsService;
    }

    getEvents = async (req, res, next) => {
        try {
            const { data, ...pagination } = await this.eventsService.getEvents(req.query, req.user);
            return res.status(200).json({ status: 'success', data: data.map(toEventDTO), ...pagination });
        } catch (error) {
            next(error);
        }
    }

    getEventsById = async (req, res, next) => {
        try {
            const event = await this.eventsService.getEventById(req.params.id, req.user);
            return res.status(200).json({ status: 'success', payload: toEventDTO(event) });
        } catch (error) {
            next(error);
        }
    }

    createEvent = async (req, res, next) => {
        try {
            const event = await this.eventsService.createEvent(req.body, req.user);
            return res.status(201).json({ status: 'success', payload: toEventDTO(event) });
        } catch (error) {
            next(error);
        }
    }

    updateEvent = async (req, res, next) => {
        try {
            const event = await this.eventsService.updateEvent(req.params.id, req.body, req.user);
            return res.status(200).json({ status: 'success', payload: toEventDTO(event) });
        } catch (error) {
            next(error);
        }
    }

    updateEventStatus = async (req, res, next) => {
        try {
            const event = await this.eventsService.changeStatus(req.params.id, req.body?.status, req.user);
            return res.status(200).json({ status: 'success', payload: toEventDTO(event) });
        } catch (error) {
            next(error);
        }
    }
}