import { Router } from 'express';
import { TicketsController } from '../controllers/tickets.controller.js';
import { ticketsService } from '../container.js';
import { auth } from '../middlewares/auth.js';

const router = Router();
const ticketsController = new TicketsController(ticketsService);

router.use(auth);

router.get('/my-tickets', ticketsController.getMyTickets);
router.patch('/:tid/cancel', ticketsController.cancelTicket);

export default router;