import { Strategy as LocalStrategy } from 'passport-local';

export const createLoginStrategy = (sessionsService) => new LocalStrategy(
    { usernameField: 'email',badRequestMessage: 'Faltan campos obligatorios' },
    async (email, password, done) => {
        try {
            return done(null, await sessionsService.validateCredentials(email, password));
        } catch (error) {
            return done(error);
        }
    }
);