import express from 'express';
import eventsRouter from './routes/events.routes.js';
import sessionsRouter from './routes/sessions.routes.js';
import healthRouter from './routes/health.routes.js';

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/health', healthRouter);
app.use('/events', eventsRouter);
app.use('/sessions', sessionsRouter);

export default app;