import { Router } from 'express';
import { EventsController } from '../controllers/events.controller.js';
import { EventsDAO } from '../dao/EventsDAO.js';
import { CategoriesDAO } from '../dao/CategoriesDAO.js';
import { auth } from '../middlewares/auth.js';
import { authorizeRoles } from '../middlewares/authorize.js';
import { EventsService } from '../services/events.service.js';
import { optionalAuth } from '../middlewares/authOptional.js';

export const router = Router();

const eventsService = new EventsService(new EventsDAO(), new CategoriesDAO());
const eventsController = new EventsController(eventsService);

router.get('/', optionalAuth, eventsController.getEvents);
router.get('/:id', optionalAuth, eventsController.getEventsById);

router.use(auth);  

router.post('/', authorizeRoles('organizer', 'admin'), eventsController.createEvent);
router.put('/:id', authorizeRoles('organizer', 'admin'), eventsController.updateEvent);
router.patch('/:id/status', authorizeRoles('organizer', 'admin'), eventsController.updateEventStatus);