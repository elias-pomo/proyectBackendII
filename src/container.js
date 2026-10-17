import { UserDAO } from './dao/UserDAO.js';
import { EventsDAO } from './dao/EventsDAO.js';
import { TicketsDAO } from './dao/TicketsDAO.js';
import { CategoriesDAO } from './dao/CategoriesDAO.js';

import { UserRepository } from './repositories/users.repositories.js';
import { EventRepository } from './repositories/event.repositories.js';
import { TicketRepository } from './repositories/ticket.repositories.js';
import { CategoryRepository } from './repositories/category.repositories.js';

import { SessionsService } from './services/sessions.service.js';
import { UsersService } from './services/users.service.js';
import { CategoriesService } from './services/categories.service.js';
import { EventsService } from './services/events.service.js';
import { TicketsService } from './services/tickets.service.js';
import { MailService } from './services/mail.service.js';

const userRepository = new UserRepository(new UserDAO());
const eventRepository = new EventRepository(new EventsDAO());
const ticketRepository = new TicketRepository(new TicketsDAO());
const categoryRepository = new CategoryRepository(new CategoriesDAO());

export const sessionsService = new SessionsService(userRepository);
export const usersService = new UsersService(userRepository);
export const categoriesService = new CategoriesService(categoryRepository);
export const eventsService = new EventsService(eventRepository, categoryRepository, ticketRepository);
export const ticketsService = new TicketsService(ticketRepository, eventRepository, categoryRepository, new MailService());