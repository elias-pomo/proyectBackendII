import { Router } from 'express';
import { requireLogin, optionalView, redirectIfLogged, requireRoleView } from '../middlewares/viewsAuth.js';

const router = Router();

// Las vistas solo arman la estructura: los datos los pide cada página a la API desde el navegador
router.get('/login', redirectIfLogged, (req, res) =>
    res.render('login', { layout: 'auth', title: 'Ingresar' }));

router.get('/registro', redirectIfLogged, (req, res) =>
    res.render('register', { layout: 'auth', title: 'Crear cuenta' }));

router.get('/', optionalView, (req, res) =>
    res.render('home', { title: 'Inicio', page: 'home' }));

router.get('/clases', optionalView, (req, res) =>
    res.render('clases', { title: 'Clases', page: 'clases' }));

router.get('/clases/:id', optionalView, (req, res) =>
    res.render('clase', { title: 'Clase', page: 'clases', eventId: req.params.id }));

router.get('/mis-reservas', requireLogin, (req, res) =>
    res.render('reservas', { title: 'Mis reservas', page: 'reservas' }));

router.get('/panel', requireLogin, requireRoleView('organizer', 'admin'), (req, res) =>
    res.render('panel', { title: 'Mi panel', page: 'panel' }));

router.get('/admin', requireLogin, requireRoleView('admin'), (req, res) =>
    res.render('admin', { title: 'Admin', page: 'admin' }));

export default router;
