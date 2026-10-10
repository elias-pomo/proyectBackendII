import passport from 'passport';
import { sessionsService } from '../container.js';
import { createJwtStrategy } from '../strategies/jwt.strategy.js';
import { createLoginStrategy } from '../strategies/login.strategy.js';
import { createRegisterStrategy } from '../strategies/register.strategy.js';

export const initPassport = () => {
    passport.use('register', createRegisterStrategy(sessionsService));
    passport.use('login', createLoginStrategy(sessionsService));
    passport.use('current', createJwtStrategy(sessionsService));
};