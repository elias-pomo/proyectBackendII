// src/routes/events.routes.js
import { Router } from 'express';
import { EventsController } from '../controllers/events.controller.js';
import { TicketsController } from '../controllers/tickets.controller.js';
import { EventsDAO } from '../dao/EventsDAO.js';
import { CategoriesDAO } from '../dao/CategoriesDAO.js';
import { TicketsDAO } from '../dao/TicketsDAO.js';
import { auth } from '../middlewares/auth.js';
import { authorizeRoles } from '../middlewares/authorize.js';
import { optionalAuth } from '../middlewares/authOptional.js';
import { EventsService } from '../services/events.service.js';
import { TicketsService } from '../services/tickets.service.js';
import { MailService } from '../services/mail.service.js';

export const router = Router();

const eventsDAO = new EventsDAO();
const eventsController = new EventsController(new EventsService(eventsDAO, new CategoriesDAO()));
const ticketsController = new TicketsController(
    new TicketsService(new TicketsDAO(), eventsDAO, new MailService())
);

router.get('/', optionalAuth, eventsController.getEvents);
router.get('/:id', optionalAuth, eventsController.getEventsById);

router.use(auth);

router.post('/', authorizeRoles('organizer', 'admin'), eventsController.createEvent);
router.put('/:id', authorizeRoles('organizer', 'admin'), eventsController.updateEvent);
router.patch('/:id/status', authorizeRoles('organizer', 'admin'), eventsController.updateEventStatus);

// Inscripciones a un evento
router.post('/:eid/tickets', ticketsController.createTicket);
router.get('/:eid/tickets', authorizeRoles('organizer', 'admin'), ticketsController.getEventTickets);