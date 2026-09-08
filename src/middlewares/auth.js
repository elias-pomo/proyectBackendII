import { config } from "../config/config.js";

export const auth = (req, res, next) =>{
    if(!req.session.user){
        res.setHeader('Content-Type','application/json');
        res.status(401).json({
            error:"no existe usuarios autenticados"
    })
}
next()
}