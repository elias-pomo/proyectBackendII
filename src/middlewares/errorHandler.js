import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

// Rutas /api inexistentes: mismo formato JSON que el resto de los errores
export const notFoundHandler = (req, res, next) => {
    next(new AppError('Ruta no encontrada', 404));
};

export const errorHandler = (error, req, res, next) => {
    if (res.headersSent) return next(error);

    let status = error.status || error.statusCode || 500;
    let message = error.message;

    if (error.name === 'ValidationError') {
        status = 400;
    } else if (error.name === 'CastError') {
        status = 400;
        message = 'ID inválido';
    } else if (error.code === 11000) {
        status = 409;
        message = 'Ya existe un registro con esos datos únicos';
    }

    // Los errores internos se registran y nunca exponen detalles al cliente
    if (status >= 500) {
        logger.error(`${req.method} ${req.originalUrl}`, error);
        message = 'Error interno del servidor';
    }

    return res.status(status).json({ status: 'error', message });
};