import passport from 'passport';
import { AppError } from '../utils/AppError.js';

export const auth = (req, res, next) => {
    passport.authenticate('current', { session: false }, (error, user) => {
        if (error) return next(error);
        if (!user) return next(new AppError('No autenticado', 401));
        req.user = user;
        next();
    })(req, res, next);
};