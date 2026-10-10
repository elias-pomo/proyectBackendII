import passport from 'passport';
import { AppError } from '../utils/AppError.js';

// Corre una estrategia local (register/login) y deja el usuario en req.user.
// Si passport corta por faltantes (status 400) se respeta; si no, se usa defaultStatus.
export const localAuth = (strategy, defaultStatus) => (req, res, next) => {
    passport.authenticate(strategy, { session: false }, (error, user, info, status) => {
        if (error) return next(error);
        if (!user) {
            return next(new AppError(info?.message ?? 'Credenciales invalidas', typeof status === 'number' ? status : defaultStatus));
        }
        req.user = user;
        next();
    })(req, res, next);
};