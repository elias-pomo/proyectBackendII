import { Router } from 'express';
import { EventsController } from '../controllers/events.controller.js';
import { EventsDAO } from '../dao/EventsDAO.js';
import { auth } from '../middlewares/auth.js';
import { authorizeRoles } from '../middlewares/authorize.js';
import { checkEventOwnership } from '../middlewares/authEventOwner.js';

export const router = Router();

const eventsDAO = new EventsDAO();
const eventsController = new EventsController(eventsDAO);

router.get('/', eventsController.getEvents);
router.post('/', auth, authorizeRoles('organizer', 'admin'), eventsController.createEvent);
router.put('/:id', auth, authorizeRoles('organizer', 'admin'), checkEventOwnership(eventsDAO), eventsController.updateEvent);
router.delete('/:id', auth, authorizeRoles('organizer', 'admin'), checkEventOwnership(eventsDAO), eventsController.deleteEvent);