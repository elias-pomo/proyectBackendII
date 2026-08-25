import { config } from "../config/config.js";

export const auth = (req, res, next) =>{
    if(req.query.user!="admin" || req.query.password != config.general.SECRET){

        res.setHeader('Content-Type','application/json');
        return res.status(401).json({error:`Credenciales invalidas`})
    }
    next()
}