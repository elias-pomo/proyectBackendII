export class EventsController{
    constructor(EventDAO){
        this.EventDAO=EventDAO 
    }

    getEvents = async (req, res) =>{
        try {
            let eventos = await this.EventDAO.get()

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
    createEvent = async(req, res) =>{
        try {
            let newEvent=await this.eventsDAO.create(req.body)
            res.setHeader('Content-Type','application/json');
            return res.status(201).json({newEvent});
        } catch (error) {
            res.setHeader('Content-Type','application/json');
            return res.status(500).json({error:`Error al crear producto: ${error.message}`})
        }
    }
}
export const informeProductos=async(req,res)=>{

    let producto="informe 1"

    res.setHeader('Content-Type','application/json')
    res.status(200).json({producto})
}

