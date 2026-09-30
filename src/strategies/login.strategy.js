import { Strategy as LocalStrategy } from "passport-local";
import { validaHash } from "../utils/hash.js";
import { userModel } from "../dao/models/user.model.js";

export const loginStrategy = new LocalStrategy(
    {
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
);