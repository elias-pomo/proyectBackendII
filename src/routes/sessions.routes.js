import { Router } from 'express';
import SessionsController from '../controllers/sessions.controller.js';
import { auth } from '../middlewares/auth.js';

const router = Router();
const sessionsController = new SessionsController();

// Rutas de sesión
router.post('/register', sessionsController.register);
router.post('/login', sessionsController.login);

// Ruta protegida 
router.post('/logout', auth, sessionsController.logout);
router.get('/current', auth,(req,res)=>{
    res.setHeader('Content-Type','application/json');
    res.status(200).json({payload:"test OK...!!!", user:req.user.first_name});
});

export default router;