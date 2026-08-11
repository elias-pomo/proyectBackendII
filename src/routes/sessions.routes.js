import { Router } from 'express';
import { loginUser } from '../controllers/sessions.controller.js';

const router = Router();

router.post('/login', loginUser);

export default router;