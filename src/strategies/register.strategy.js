import { Strategy as LocalStrategy } from 'passport-local';

export const createRegisterStrategy = (sessionsService) => new LocalStrategy(
    {
        usernameField: 'email',
        passReqToCallback: true,
        badRequestMessage: 'Todos los campos son obligatorios'
    },
    async (req, email, password, done) => {
        try {
            const { first_name, last_name } = req.body;
            return done(null, await sessionsService.register({ first_name, last_name, email, password }));
        } catch (error) {
            return done(error);
        }
    }
);