import express from 'express';
import session from 'express-session';
import { engine } from 'express-handlebars';
import path from 'path';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { config } from './config/config.js';
import { initPassport } from './config/passport.config.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { router as eventsRouter } from './routes/events.routes.js';
import sessionsRouter from './routes/sessions.routes.js';
import usersRouter from './routes/users.routes.js';
import categoriesRouter from './routes/categories.routes.js';
import ticketsRouter from './routes/tickets.routes.js';
import viewsRouter from './routes/views.routes.js';

const app = express();

app.use(express.static(path.join(import.meta.dirname, '../public')));

app.engine('handlebars', engine({ helpers: { eq: (a, b) => a === b } }));
app.set('view engine', 'handlebars');
app.set('views', path.join(import.meta.dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: config.general.JWT_SECRET,
    saveUninitialized: false,
    resave: false
}));

initPassport();
app.use(passport.initialize());

app.use('/', viewsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/users', usersRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/categories', categoriesRouter);

app.use('/api', notFoundHandler);
app.use(errorHandler);

export default app;