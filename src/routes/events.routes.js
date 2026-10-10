import { Router } from 'express';
import { EventsController } from '../controllers/events.controller.js';
import { TicketsController } from '../controllers/tickets.controller.js';
import { eventsService, ticketsService } from '../container.js';
import { auth } from '../middlewares/auth.js';
import { authorizeRoles } from '../middlewares/authorize.js';
import { optionalAuth } from '../middlewares/authOptional.js';

export const router = Router();

const eventsController = new EventsController(eventsService);
const ticketsController = new TicketsController(ticketsService);

router.get('/', optionalAuth, eventsController.getEvents);
router.get('/:id', optionalAuth, eventsController.getEventsById);

router.use(auth);

router.post('/', authorizeRoles('organizer', 'admin'), eventsController.createEvent);
router.put('/:id', authorizeRoles('organizer', 'admin'), eventsController.updateEvent);
router.patch('/:id/status', authorizeRoles('organizer', 'admin'), eventsController.updateEventStatus);

// Inscripciones a un evento
router.post('/:eid/tickets', ticketsController.createTicket);
router.get('/:eid/tickets', authorizeRoles('organizer', 'admin'), ticketsController.getEventTickets);