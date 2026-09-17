import { Router } from 'express';
import SessionsController from '../controllers/sessions.controller.js';
import { auth } from '../middlewares/auth.js';
import passport from 'passport';

const router = Router();
const sessionsController = new SessionsController();

// Rutas de sesión
router.post('/register',passport.authenticate('register',{
    session:false,}), sessionsController.register);
router.post('/login', passport.authenticate('login',{
    session:false}), sessionsController.login);

// Ruta protegida 
router.post('/logout', auth, sessionsController.logout);
router.get('/current', passport.authenticate('current',{
    session: false
}), auth, sessionsController.currentUser);

export default router;