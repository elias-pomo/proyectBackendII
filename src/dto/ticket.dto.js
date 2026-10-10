import { isPopulated } from './utils.js';

// Del usuario poblado solo salen estos campos: nunca password
const toTicketUserRef = (user) => ({
    _id: user._id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email
});

const toTicketEventRef = (event) => ({
    _id: event._id,
    title: event.title,
    date: event.date,
    endDate: event.endDate,
    location: event.location,
    status: event.status
});

export const toTicketDTO = (ticket) => ({
    _id: ticket._id,
    user: isPopulated(ticket.user) ? toTicketUserRef(ticket.user) : ticket.user,
    event: isPopulated(ticket.event) ? toTicketEventRef(ticket.event) : ticket.event,
    status: ticket.status,
    quantity: ticket.quantity,
    reservationCode: ticket.reservationCode,
    cancelledAt: ticket.cancelledAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt
});