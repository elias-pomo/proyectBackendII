import { Strategy as LocalStrategy } from "passport-local";
import { createHash} from "../utils/hash.js";
import { userModel } from "../dao/models/user.model.js";

export const registerStrategy = new LocalStrategy(
    {
                usernameField: 'email',
                passReqToCallback: true,
                badRequestMessage: 'Todos los campos son obligatorios'
            },
            async (req, email, password, done) => {
            try {
                const {first_name, last_name} = req.body;
                
                if(!first_name || !last_name || !email || !password){
                    return done(null, false, {
                        status: 400, 
                        message: 'Todos los campos son obligatorios'
                    })
                }
                
                const normalizedEmail = email.toLowerCase().trim();
                
                const userExists = await userModel.findOne({ email: normalizedEmail });
                
                if(userExists){
                    return done(null, false, {
                        status:409,
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
                    const createdUser = await userModel.create(newUser);
    
                    return done(null, createdUser);
                }catch (error) {
                    return done(error);
                }
            }
);