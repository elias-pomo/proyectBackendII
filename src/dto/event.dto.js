// src/dto/event.dto.js
import { isPopulated } from './utils.js';

const toCategoryRef = (category) => ({
    _id: category._id,
    name: category.name,
    color: category.color,
    maxQuantityPerTicket: category.maxQuantityPerTicket
});

const toOrganizerRef = (user) => ({
    _id: user._id,
    first_name: user.first_name,
    last_name: user.last_name
});

export const toEventDTO = (event) => ({
    _id: event._id,
    code: event.code,
    title: event.title,
    description: event.description,
    category: isPopulated(event.category) ? toCategoryRef(event.category) : event.category,
    date: event.date,
    endDate: event.endDate,
    location: event.location,
    capacity: event.capacity,
    price: event.price,
    status: event.status,
    organizer: isPopulated(event.organizer) ? toOrganizerRef(event.organizer) : event.organizer,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
});