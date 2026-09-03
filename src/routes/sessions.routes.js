import { Router } from 'express';
import SessionsController from '../controllers/sessions.controller.js';

const router = Router();
const sessionsController = new SessionsController();

router.post('/register', sessionsController.register);

export default router;