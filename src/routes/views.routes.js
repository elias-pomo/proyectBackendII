import { Router } from 'express';
import { requireLogin, redirectIfLogged } from '../middlewares/viewsAuth.js';

const router = Router();

router.get('/login', redirectIfLogged, (req, res) =>
    res.render('login', { layout: 'auth', title: 'Iniciar sesión' }));

router.get('/registro', redirectIfLogged, (req, res) =>
    res.render('register', { layout: 'auth', title: 'Crear cuenta' }));

router.get('/', requireLogin, (req, res) =>
    res.render('home', { title: 'Inicio', page: 'home' }));

export default router;