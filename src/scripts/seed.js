// src/scripts/seed.js
// Carga datos de prueba: un usuario por rol, las categorías del gimnasio y clases publicadas.
// Es idempotente: si un usuario, categoría o clase ya existe, no lo duplica ni lo modifica.
// Uso: npm run seed
import 'dotenv/config';
import mongoose from 'mongoose';
import { connDB } from '../config/database.js';
import { UserDAO } from '../dao/UserDAO.js';
import { CategoriesDAO } from '../dao/CategoriesDAO.js';
import { EventsDAO } from '../dao/EventsDAO.js';
import { UserRepository } from '../repositories/users.repositories.js';
import { CategoryRepository } from '../repositories/category.repositories.js';
import { EventRepository } from '../repositories/event.repositories.js';
import { EventsService } from '../services/events.service.js';
import { createHash } from '../utils/hash.js';
import { logger } from '../utils/logger.js';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

// Credenciales de prueba documentadas en el README: no usar en producción
const SEED_USERS = [
    { first_name: 'Admin', last_name: 'Ringo', email: 'admin@ringobox.test', password: 'Admin123!', role: 'admin' },
    { first_name: 'Olga', last_name: 'Organizadora', email: 'organizer@ringobox.test', password: 'Organizer123!', role: 'organizer' },
    { first_name: 'Otto', last_name: 'Organizador', email: 'organizer2@ringobox.test', password: 'Organizer123!', role: 'organizer' },
    { first_name: 'Ursula', last_name: 'Usuaria', email: 'user@ringobox.test', password: 'User123!', role: 'user' },
    { first_name: 'Ulises', last_name: 'Usuario', email: 'user2@ringobox.test', password: 'User123!', role: 'user' }
];

const SEED_CATEGORIES = [
    { name: 'Boxeo', description: 'Técnica, guantes y bolsa', color: '#dc2626' },
    { name: 'Kickboxing', description: 'Golpes de puño y patadas', color: '#2563eb' },
    { name: 'Funcional', description: 'Fuerza y resistencia', color: '#16a34a' },
    { name: 'Sparring', description: 'Combate controlado, un lugar por inscripción', color: '#9333ea', maxQuantityPerTicket: 1 }
];

// 12 clases publicadas (alcanza para probar ?page=2&limit=5) y una con cupo 1 para probar "sin cupo"
const seedEvents = () => {
    const categories = ['Boxeo', 'Kickboxing', 'Funcional', 'Sparring'];
    const events = Array.from({ length: 12 }, (_, i) => ({
        code: `SEED-${String(i + 1).padStart(2, '0')}`,
        title: `${categories[i % 4]} - clase ${i + 1}`,
        description: `Clase de ${categories[i % 4].toLowerCase()} para todos los niveles`,
        category: categories[i % 4],
        location: i % 2 === 0 ? 'Ring principal' : 'Salón 2',
        capacity: 10 + i,
        price: i % 3 === 0 ? 0 : 5000,
        status: 'published',
        offsetDays: i + 2
    }));
    events.push({
        code: 'SEED-CUPO1',
        title: 'Sparring - cupo único',
        description: 'Clase con un solo lugar, para probar el error de cupo',
        category: 'Sparring',
        location: 'Ring principal',
        capacity: 1,
        price: 0,
        status: 'published',
        offsetDays: 3
    });
    return events;
};

const seed = async () => {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('El seed crea usuarios con contraseñas conocidas: no se ejecuta con NODE_ENV=production');
    }

    await connDB();

    const userRepository = new UserRepository(new UserDAO());
    const categoryRepository = new CategoryRepository(new CategoriesDAO());
    const eventRepository = new EventRepository(new EventsDAO());
    const eventsService = new EventsService(eventRepository, categoryRepository);

    const users = {};
    for (const { password, ...data } of SEED_USERS) {
        const existing = await userRepository.findByEmail(data.email);
        users[data.email] = existing ?? await userRepository.create({ ...data, password: createHash(password) });
        logger.info(`${existing ? 'Ya existía' : 'Creado'} el usuario ${data.email} (${data.role})`);
    }

    for (const category of SEED_CATEGORIES) {
        const existing = await categoryRepository.findByName(category.name);
        if (!existing) await categoryRepository.create(category);
        logger.info(`${existing ? 'Ya existía' : 'Creada'} la categoría ${category.name}`);
    }

    // Las clases se crean con el service, así pasan por las mismas validaciones que la API
    const organizer = users['organizer@ringobox.test'];
    for (const { offsetDays, ...event } of seedEvents()) {
        const { total } = await eventRepository.findPaginated({ code: event.code }, { sortField: 'date', sortDir: 1, page: 1, limit: 1 });
        if (total > 0) {
            logger.info(`Ya existía la clase ${event.code}`);
            continue;
        }
        const date = new Date(Date.now() + offsetDays * DAY);
        date.setHours(19, 0, 0, 0);
        await eventsService.createEvent({
            ...event,
            date: date.toISOString(),
            endDate: new Date(date.getTime() + HOUR).toISOString()
        }, organizer);
        logger.info(`Creada la clase ${event.code}`);
    }
};

seed()
    .then(() => logger.info('Seed terminado'))
    .catch((error) => {
        logger.error('Error al ejecutar el seed', error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
