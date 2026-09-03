import express from 'express';
import { router as eventsRouter } from './routes/events.routes.js';
import { logger } from './middlewares/log.js';
import  { connDB }  from './config/database.js';
import { config } from './config/config.js';
import {errorHandler} from './middlewares/errorHandler.js';
import sessionsRouter from './routes/sessions.routes.js';

const PORT=config.general.PORT;

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/events",eventsRouter);
app.use('/api/sessions', sessionsRouter);

app.get('/',(req, res)=>{


    res.setHeader('Content-Type','text/plain');
    res.status(200).send('OK...!!!');
})
app.get('/test',(req,res)=>{
    if(req.query.error){
        throw new Error ("Error de pruebas")
    }


    res.setHeader('Content-Type','text/plain');
    res.status(200).send('test OK...!!!');
})

app.use(errorHandler)

const server=app.listen(PORT,()=>{
    console.log(`Server escuchando en puerto ${PORT}`);
});

connDB(config.database.MONGO_URL, config.database.DB_NAME)

export default app;