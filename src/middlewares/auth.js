import jwt from "jsonwebtoken"
import { config } from "../config/config.js";

export const auth=(req, res, next)=>{
    if(!req.cookies.currentUser){
        res.setHeader('Content-Type','application/json');
        return res.status(401).json({error:`No hay usuarios autenticados`})
    }


    // let token=req.headers.authorization.split(" ")[1]
    let token=req.cookies.currentUser;

    try {
        let user=jwt.verify(token, config.general.SECRET);
        req.user=user
    } catch (error) {
        res.setHeader('Content-Type','application/json');
        return res.status(401).json({error:`Credenciales invalidas: ${error.message}`})
    }

    next()
}