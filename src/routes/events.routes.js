import { Router } from 'express';
import { EventsController } from './index';

export const router = Router();

router.get('/', EventsController.getEvents);

router.get('/id', EventsController.getEventsById)

router.get('/informe1/',(req, res)=>{
    let evento = 'informe 1'

    res.setHeader('content-type', 'application/json')
    res.status(200).json({evento})
})

router.post('/',(req, res)=>{
    let newEvent = "nuevo evento"

    res.setHeader('content-type', 'application/json')
    res.status(200).json({newEvent})
})