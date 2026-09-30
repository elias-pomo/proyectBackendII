// src/strategies/jwt.strategy.js
import { Strategy as JwtStrategy } from 'passport-jwt';
import { userModel } from "../dao/models/user.model.js";
import { config } from '../config/config.js';

const cookieExtractor = req =>{
    let token = null;
    if(req && req.cookies){
        token = req.cookies.currentUser
    }
    return token;
}

export const jwtStrategy = new JwtStrategy(
{
    jwtFromRequest: cookieExtractor,
    secretOrKey: config.general.SECRET,
},
async (jwtpayload, done) =>{
        try {
            const user = await userModel.findById(jwtpayload._id).select('-password').lean();

            if(!user){
                return done(null, false,{
                    message: 'Usuario no encontrado'
                })
            }
            return done(null, user);
        }catch (error) {
            return done(error);
        }
    }
);
