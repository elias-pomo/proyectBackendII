export const authorizeRoles = (...allowedRoles) => {

    return(req, res, next) =>{
        if(!req.user){
            return res.status(401).json({
                status: 'error',
                message: 'No autorizado'
            })
        }
        if(!allowedRoles.includes(req.user.role)){
            return res.status(403).json({
                status: 'error',
                message: 'No tenes permisos para realizar esta accion'
            })
        }
        next();
    }
}