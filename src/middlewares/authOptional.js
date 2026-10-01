import passport from 'passport';

export const optionalAuth = (req, res, next) => {
    passport.authenticate('current', { session: false }, (err, user) => {
        if (err) return next(err);
        if (user) req.user = user; 
        next();
    })(req, res, next);
};