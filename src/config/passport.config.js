import passport from "passport";
import passportJWT from "passport-jwt"
import { Strategy as LocalStrategy } from "passport-local";
import { userModel } from "../dao/models/user.model.js";
import { createHash, validaHash } from "../utils/hash.js";
import { Strategy as JwtStrategy } from "passport-jwt";
import { config } from "./config.js";

const cookieExtractor = req =>{
    let token = null;
    if(req && req.cookies){
        token = req.cookies.currentUser
    }
    return token;
}
export const initPassport = () =>{

    passport.use(
        'register',
        new LocalStrategy({
            usernameField: 'email',
            passReqToCallback: true
        },
        async (req, email, password, done) => {
        try {
            const {first_name, last_name} = req.body;
            
            if(!first_name || !last_name || !email || !password){
                return done(null, false, {
                    message: 'Todos los campos son obligatorios'
                })
            }
            
            const normalizedEmail = email.toLowerCase().trim();
            
            const userExists = await userModel.findOne({ email: normalizedEmail });
            
            if(userExists){
                return done(null, false, {
                    message: 'El email ya esta registrado'
                })
            }
            
            const hashedPassword = createHash(password);
            
            const newUser ={
                first_name,
                last_name,
                email: normalizedEmail,
                password: hashedPassword,
                role: 'user'
            }
                return done(null, newUser);
            }catch (error) {
                return done(error);
            }
        }
    )
)

passport.use(
    'login',
    new LocalStrategy({
        usernameField: 'email',        
    },
    async (email, password, done) => {
        try {
            if(!email || !password){
                return done(null, false, {
                    message: 'Faltan campos obligatorios'
                })
            }
            
            const normalizedEmail = email.toLowerCase().trim();
            
            let user = await userModel.findOne({
                email: normalizedEmail
            })
            
            if(!user){
                return done(null, false,{
                    message: 'Credenciales invalidas'
                })
            }
            
            const isValidPassword = validaHash(password, user.password);
            if(!isValidPassword){
                return done(null, false,{
                    message: 'Credenciales invalidas'
                })
            }
            
            return done(null, user);
        }catch (error) {
            return done(error);
        }
    }
)
)

passport.use(
    'current',
    new JwtStrategy({
        jwtFromRequest: cookieExtractor,
        secretOrKey: config.general.SECRET
    },
    async (jwtpayload, done) =>{
        try {
            const user = await userModel.findById(jwtpayload.id);

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
)
)
}

