export const errorHandler = (error, req, res, next) => {
    let status = error.status || error.statusCode || 500;
    let message = error.message || "Error interno del servidor";

    if (error.name === 'ValidationError') {
        status = 400;
    } else if (error.name === 'CastError') {
        status = 400;
        message = 'ID inválido';
    } else if (error.code === 11000) {
        status = 409;
        message = 'Ya existe un registro con esos datos únicos';
    }

    return res.status(status).json({ status: 'error', message });
};