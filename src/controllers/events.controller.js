export class EventsController{
    constructor(eventsDAO){
        this.eventsDAO=eventsDAO 
    }

    getEvents = async (req, res) =>{
        try {
            let eventos = await this.eventsDAO.get()

        res.setHeader('content-type', 'application/json')
        res.status(200).json({message:"listado de eventos", eventos})
        } catch (error) {
            res.setHeader('Content-Type','application/json');
            return res.status(500).json({error:`Internal server error`})
        }
        
    }

    getEventsById = async (req, res)=>{
        try {
            let evento=`Evento ${req.params.id}`

            res.setHeader('content-type', 'application/json')
            res.status(200).json({evento})
        } catch (error) {
            res.setHeader('Content-Type','application/json');
            return res.status(500).json({error:`Internal server error`})
        }
        
    }
    // dentro de EventsController
updateEvent = async (req, res, next) => {
    try {
        const allowed = ['code', 'title', 'description', 'price', 'capacity'];
        const data = Object.fromEntries(
            Object.entries(req.body).filter(([key]) => allowed.includes(key))
        );

        if (Object.keys(data).length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No hay campos válidos para actualizar'
            });
        }

        const updated = await this.eventsDAO.update(req.params.id, data);
        return res.status(200).json({ status: 'success', payload: updated });
    } catch (error) {
        next(error);
    }
}

deleteEvent = async (req, res, next) => {
    try {
        await this.eventsDAO.delete(req.params.id);
        return res.status(200).json({ status: 'success', message: 'Evento eliminado' });
    } catch (error) {
        next(error);
    }
}
    createEvent = async (req, res, next) => {
    try {
        const { code, title, description, price, capacity } = req.body;
        const newEvent = await this.eventsDAO.create({
            code, title, description, price, capacity,
            organizer: req.user._id
        });
        return res.status(201).json({ status: 'success', payload: newEvent });
    } catch (error) {
        next(error);
    }
}
}
