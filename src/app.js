import express from 'express';
import { router as EventsRouter } from './routes/events.routes';
import { logger } from './middlewares/log';
import { config } from './config/config';
import {errorHandler} from './middlewares/errorHandler';

const PORT=config.general.PORT;

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/events",eventsRouter);

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