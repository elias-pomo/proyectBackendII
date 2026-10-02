// src/routes/tickets.routes.js
import { Router } from 'express';
import { TicketsController } from '../controllers/tickets.controller.js';
import { TicketsService } from '../services/tickets.service.js';
import { MailService } from '../services/mail.service.js';
import { TicketsDAO } from '../dao/TicketsDAO.js';
import { EventsDAO } from '../dao/EventsDAO.js';
import { auth } from '../middlewares/auth.js';

const router = Router();
const ticketsController = new TicketsController(
    new TicketsService(new TicketsDAO(), new EventsDAO(), new MailService())
);

router.use(auth);

router.get('/my-tickets', ticketsController.getMyTickets);
router.patch('/:tid/cancel', ticketsController.cancelTicket);

export default router;