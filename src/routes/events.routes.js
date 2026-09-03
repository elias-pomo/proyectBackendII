import { Router } from 'express';
import { EventsController } from '../controllers/events.controller.js';

import {EventsDAO} from '../dao/EventsDAO.js'; 

export const router = Router();


const eventsDAO = new EventsDAO();
const eventsController = new EventsController(eventsDAO);


router.get('/', eventsController.getEvents);



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