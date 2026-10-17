import passport from 'passport';

const getUser = (req, res, next, onResult) =>
    passport.authenticate('current', { session: false }, (err, user) => {
        if (err) return next(err);
        onResult(user || null);
    })(req, res, next);

// Lo que necesitan los layouts para armar la navegación según el rol
const setUserLocals = (req, res, user) => {
    req.user = user;
    res.locals.user = user;
    res.locals.isAdmin = user.role === 'admin';
    res.locals.canManage = ['organizer', 'admin'].includes(user.role);
};

// Páginas con sesión obligatoria: sin sesión redirige a /login y vuelve después de ingresar
export const requireLogin = (req, res, next) =>
    getUser(req, res, next, (user) => {
        if (!user) return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
        setUserLocals(req, res, user);
        next();
    });

// Páginas públicas que cambian si hay sesión (inicio, cartelera, detalle de clase)
export const optionalView = (req, res, next) =>
    getUser(req, res, next, (user) => {
        if (user) setUserLocals(req, res, user);
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
