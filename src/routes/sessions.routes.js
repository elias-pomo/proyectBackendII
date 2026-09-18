import { Router } from 'express';
import SessionsController from '../controllers/sessions.controller.js';
import { auth } from '../middlewares/auth.js';
import passport from 'passport';

const router = Router();
const sessionsController = new SessionsController();

// Rutas de sesión
router.post('/register', (req, res, next) => {
    passport.authenticate('register', { session: false }, (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            return res.status(400).json({
                status: 'error',
                message: info?.message || 'Error en el registro'
            });
        }
        req.user = user;
        next();
    })(req, res, next);
}, sessionsController.register);

router.post('/login', (req, res, next) => {
    passport.authenticate('login', { session: false }, (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: info?.message || 'Credenciales invalidas'
            });
        }
        req.user = user;
        next();
    })(req, res, next);
}, sessionsController.login);

// Ruta protegida 
router.post('/logout', auth, sessionsController.logout);
router.get('/current',  passport.authenticate('current',{
    session: false
}), sessionsController.currentUser);

export default router;