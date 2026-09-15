import express from 'express';
import { router as eventsRouter } from './routes/events.routes.js';
import  { connDB }  from './config/database.js';
import { config } from './config/config.js';
import {errorHandler} from './middlewares/errorHandler.js';
import sessionsRouter from './routes/sessions.routes.js';
import session from 'express-session';
import {engine} from 'express-handlebars';
import path from 'path';
import { auth } from './middlewares/auth.js';
import cookieParser from 'cookie-parser';

const PORT=config.general.PORT;

const app = express();

// Middlewares
app.use(express.static(path.join(import.meta.dirname, '../public')));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(import.meta.dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.json());
app.use(cookieParser());

app.use(session({
    secret: config.general.SECRET,
    saveUninitialized: false,
    resave: false,
}));


app.get('/',(req,res)=>{
    res.setHeader('Content-Type','text/plain');
    res.status(200).send('OK');
})
app.use("/api/events",eventsRouter);
app.use('/api/sessions', sessionsRouter);

app.get('/test', auth,(req,res)=>{
    res.setHeader('Content-Type','application/json');
    res.status(200).json({payload:"test OK...!!!", user:req.user.first_name});
})

app.use(errorHandler)

const server=app.listen(PORT,()=>{
    console.log(`Server escuchando en puerto ${PORT}`);
});

connDB(config.database.MONGO_URL, config.database.DB_NAME)

export default app;