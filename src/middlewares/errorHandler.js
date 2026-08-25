export const errorHandler=(error, req, res, next)=>{

    res.setHeader('Content-Type','application/json');
    return res.status(400).json({error:`Error interno del servidor`})
}