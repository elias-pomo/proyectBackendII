import passport from "passport";
import { jwtStrategy } from "../strategies/jwt.strategy.js";
import { loginStrategy } from "../strategies/login.strategy.js";
import { registerStrategy } from "../strategies/register.strategy.js";


export const initPassport = () =>{
    
    passport.use('register', registerStrategy)
    passport.use('login', loginStrategy)
    passport.use('current', jwtStrategy)
}

