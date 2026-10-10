import { Router } from 'express';
import { SessionsController } from '../controllers/sessions.controller.js';
import { sessionsService } from '../container.js';
import { auth } from '../middlewares/auth.js';
import { localAuth } from '../middlewares/localAuth.js';

const router = Router();
const sessionsController = new SessionsController(sessionsService);

router.post('/register', localAuth('register', 400), sessionsController.register);
router.post('/login', localAuth('login', 401), sessionsController.login);

router.post('/logout', auth, sessionsController.logout);
router.get('/current', auth, sessionsController.currentUser);

export default router;