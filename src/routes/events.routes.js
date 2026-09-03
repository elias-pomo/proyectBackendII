import { Router } from 'express';
import { EventsController } from '../controllers/events.controller.js';
// 1. Importa tu DAO (asegúrate de que la ruta coincida con la estructura de tu proyecto)
import {EventsDAO} from '../dao/EventsDAO.js'; 

export const router = Router();

// 2. Creas la instancia del DAO y luego la del Controlador inyectando el DAO
const eventsDAO = new EventsDAO();
const eventsController = new EventsController(eventsDAO);

// 3. Usas la instancia (con minúscula) para llamar a los métodos
router.get('/', eventsController.getEvents);

// Nota: Cambié '/id' por '/:id' con dos puntos. Así Express lo toma como un parámetro dinámico para que tu req.params.id funcione correctamente.
router.get('/:id', eventsController.getEventsById);

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