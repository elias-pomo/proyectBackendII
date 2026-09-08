export const errorHandler=(error, req, res, next)=>{

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Error interno del servidor";

    res.setHeader('Content-Type','application/json');
    return res.status(status).json({ status: "error", message });
}