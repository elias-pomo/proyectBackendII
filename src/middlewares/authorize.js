import { AppError } from '../utils/AppError.js';

export const authorizeRoles = (...allowedRoles) => (req, res, next) => {
    if (!req.user) return next(new AppError('No autorizado', 401));
    if (!allowedRoles.includes(req.user.role)) {
        return next(new AppError('No tenes permisos para realizar esta accion', 403));
    }
    next();
};