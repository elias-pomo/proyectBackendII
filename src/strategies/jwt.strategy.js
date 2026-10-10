import { Strategy as JwtStrategy } from 'passport-jwt';
import { config } from '../config/config.js';

const cookieExtractor = (req) => req?.cookies?.currentUser ?? null;

export const createJwtStrategy = (sessionsService) => new JwtStrategy(
    { jwtFromRequest: cookieExtractor, secretOrKey: config.general.SECRET },
    async (payload, done) => {
        try {
            const user = await sessionsService.getUserById(payload._id);
            if (!user) return done(null, false, { message: 'Usuario no encontrado' });
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
);