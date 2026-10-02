import passport from 'passport';

const getUser = (req, res, next, onResult) =>
    passport.authenticate('current', { session: false }, (err, user) => {
        if (err) return next(err);
        onResult(user || null);
    })(req, res, next);

// Páginas con sesión obligatoria: sin sesión redirige a /login
export const requireLogin = (req, res, next) =>
    getUser(req, res, next, (user) => {
        if (!user) return res.redirect('/login');
        req.user = user;
        res.locals.user = user;                                     
        res.locals.isAdmin = user.role === 'admin';
        res.locals.canManage = ['organizer', 'admin'].includes(user.role);
        next();
    });

// /login y /registro: con sesión activa no tienen sentido
export const redirectIfLogged = (req, res, next) =>
    getUser(req, res, next, (user) => (user ? res.redirect('/') : next()));

// Páginas por rol (va después de requireLogin): hay sesión pero no permiso, 403
export const requireRoleView = (...roles) => (req, res, next) =>
    roles.includes(req.user.role)
        ? next()
        : res.status(403).render('forbidden', { title: 'Sin permisos' });