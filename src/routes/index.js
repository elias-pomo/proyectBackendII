import { EventsController} from '../controllers/events.controller';
import { EventsDAO} from '..dao/EventsDAO'

const EventsDAO = new EventsDAO()

export const EventsController = new EventsController(EventsDAO)

