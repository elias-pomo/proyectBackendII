// src/scripts/seed.js
// Carga datos de prueba: un usuario por rol, las disciplinas del club y la grilla semanal de clases
// de la semana actual y las 3 siguientes.
// Es idempotente: si un usuario, disciplina o clase ya existe (por email, nombre o código), no lo
// duplica ni lo modifica. Correrlo de nuevo más adelante agrega las semanas que falten.
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
const WEEKS = 4;   // semana actual + 3

// Credenciales de prueba documentadas en el README: no usar en producción
const SEED_USERS = [
    { first_name: 'Admin', last_name: 'Club', email: 'admin@ringobox.test', password: 'Admin123!', role: 'admin' },
    { first_name: 'Lucía', last_name: 'Ferreyra', email: 'organizer@ringobox.test', password: 'Organizer123!', role: 'organizer' },
    { first_name: 'Martín', last_name: 'Gómez', email: 'organizer2@ringobox.test', password: 'Organizer123!', role: 'organizer' },
    { first_name: 'Ursula', last_name: 'Usuaria', email: 'user@ringobox.test', password: 'User123!', role: 'user' },
    { first_name: 'Ulises', last_name: 'Usuario', email: 'user2@ringobox.test', password: 'User123!', role: 'user' }
];

const SEED_CATEGORIES = [
    { name: 'Boxeo', description: 'Guardia, juego de piernas, combinaciones y trabajo de bolsa y manoplas.' },
    { name: 'Kickboxing', description: 'Golpes de puño y patadas con técnica, ritmo y control.' },
    { name: 'Funcional', description: 'Fuerza, potencia y resistencia pensadas para deportes de contacto.' },
    { name: 'MMA', description: 'Golpeo, derribos y control en el piso. Un lugar por reserva.', maxQuantityPerTicket: 1 },
    { name: 'Taekwondo', description: 'Patadas, velocidad y técnica del arte marcial coreano, para juniors y adultos.' }
];

// Clases tipo: lo que se repite cada vez que aparece en la grilla
const CLASS_TYPES = {
    boxeoInicial: {
        category: 'Boxeo', title: 'Boxeo iniciación', minutes: 60, location: 'Ring principal', capacity: 14, price: 7000,
        description: 'Tu primera vez arriba del ring. Guardia, desplazamientos, golpes rectos y las primeras combinaciones en la bolsa. No hace falta experiencia.'
    },
    boxeoAvanzado: {
        category: 'Boxeo', title: 'Boxeo avanzado', minutes: 75, location: 'Ring principal', capacity: 12, price: 8000,
        description: 'Combinaciones largas, esquivas, contragolpe y trabajo de manoplas con el profe. Para quienes ya entrenan hace al menos 6 meses.'
    },
    boxeoManana: {
        category: 'Boxeo', title: 'Boxeo mañana', minutes: 60, location: 'Ring principal', capacity: 12, price: 7000,
        description: 'Técnica y acondicionamiento para arrancar el día. Todos los niveles: cada uno trabaja a su ritmo.'
    },
    boxeoIntensivo: {
        category: 'Boxeo', title: 'Boxeo intensivo de sábado', minutes: 90, location: 'Ring principal', capacity: 16, price: 9000,
        description: 'Una hora y media de técnica, rounds de bolsa y circuito de fuerza. La clase más completa de la semana.'
    },
    kickInicial: {
        category: 'Kickboxing', title: 'Kickboxing iniciación', minutes: 60, location: 'Sala de combate', capacity: 14, price: 7000,
        description: 'Las bases: guardia, patadas circulares y frontales y combinaciones simples de puño y pierna, siempre con control.'
    },
    kickAvanzado: {
        category: 'Kickboxing', title: 'Kickboxing avanzado', minutes: 75, location: 'Sala de combate', capacity: 12, price: 8000,
        description: 'Combinaciones largas, defensa de patadas y trabajo en pareja con paos. Requiere base técnica.'
    },
    funcionalManana: {
        category: 'Funcional', title: 'Funcional mañana', minutes: 45, location: 'Sala funcional', capacity: 16, price: 6000,
        description: 'Circuito de fuerza y potencia con kettlebells, sogas y peso corporal. 45 minutos para arrancar el día con todo.'
    },
    funcionalTarde: {
        category: 'Funcional', title: 'Funcional para peleadores', minutes: 60, location: 'Sala funcional', capacity: 16, price: 6000,
        description: 'Preparación física específica para deportes de contacto: explosión, core y resistencia para aguantar los rounds.'
    },
    mmaFundamentos: {
        category: 'MMA', title: 'MMA fundamentos', minutes: 75, location: 'Jaula', capacity: 10, price: 8500,
        description: 'Golpeo, derribos y control en el piso integrados. Entrenamiento técnico con compañero, sin sparring.'
    },
    mmaSparring: {
        category: 'MMA', title: 'MMA sparring controlado', minutes: 75, location: 'Jaula', capacity: 8, price: 8500,
        description: 'Rounds de sparring guiados por el profe, con protecciones completas. Cupo reducido para trabajar con seguridad.'
    },
    tkdJuniors: {
        category: 'Taekwondo', title: 'Taekwondo juniors (10 a 15 años)', minutes: 60, location: 'Sala de combate', capacity: 16, price: 6000,
        description: 'Técnica, flexibilidad y disciplina para chicos y chicas de 10 a 15 años. Preparación para exámenes de cinturón.'
    },
    tkdAdultos: {
        category: 'Taekwondo', title: 'Taekwondo adultos', minutes: 60, location: 'Sala de combate', capacity: 14, price: 6500,
        description: 'Patadas de velocidad y potencia, poomsae y combate reglamentado. Todos los niveles.'
    }
};

// Grilla semanal: día (0 = lunes), hora en Argentina, clase tipo y profe
const WEEKLY_SCHEDULE = [
    { day: 0, time: '07:30', type: 'funcionalManana', teacher: 'organizer' },
    { day: 0, time: '18:00', type: 'boxeoInicial', teacher: 'organizer' },
    { day: 0, time: '19:15', type: 'kickInicial', teacher: 'organizer' },
    { day: 0, time: '20:30', type: 'mmaFundamentos', teacher: 'organizer2' },

    { day: 1, time: '08:00', type: 'boxeoManana', teacher: 'organizer' },
    { day: 1, time: '17:30', type: 'tkdJuniors', teacher: 'organizer2' },
    { day: 1, time: '19:00', type: 'boxeoAvanzado', teacher: 'organizer' },
    { day: 1, time: '20:30', type: 'funcionalTarde', teacher: 'organizer' },

    { day: 2, time: '07:30', type: 'funcionalManana', teacher: 'organizer' },
    { day: 2, time: '18:00', type: 'kickInicial', teacher: 'organizer' },
    { day: 2, time: '19:15', type: 'boxeoInicial', teacher: 'organizer' },
    { day: 2, time: '20:30', type: 'tkdAdultos', teacher: 'organizer2' },

    { day: 3, time: '08:00', type: 'boxeoManana', teacher: 'organizer' },
    { day: 3, time: '17:30', type: 'tkdJuniors', teacher: 'organizer2' },
    { day: 3, time: '19:00', type: 'kickAvanzado', teacher: 'organizer' },
    { day: 3, time: '20:30', type: 'mmaFundamentos', teacher: 'organizer2' },

    { day: 4, time: '07:30', type: 'funcionalManana', teacher: 'organizer' },
    { day: 4, time: '18:00', type: 'boxeoInicial', teacher: 'organizer' },
    { day: 4, time: '19:15', type: 'funcionalTarde', teacher: 'organizer' },
    { day: 4, time: '20:30', type: 'mmaSparring', teacher: 'organizer2' },

    { day: 5, time: '10:00', type: 'boxeoIntensivo', teacher: 'organizer' },
    { day: 5, time: '11:45', type: 'tkdAdultos', teacher: 'organizer2' }
];

// ---------- Fechas en hora argentina ----------
const TZ = 'America/Argentina/Buenos_Aires';
const dayKeyOf = (date) => new Date(date).toLocaleDateString('en-CA', { timeZone: TZ });   // "2026-10-19"
const keyToNoon = (key) => new Date(`${key}T12:00:00-03:00`);
const addDays = (key, n) => dayKeyOf(keyToNoon(key).getTime() + n * DAY);
const mondayOf = (key) => {
    const weekday = new Date(keyToNoon(key)).toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ });
    return addDays(key, -['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday));
};

const PREFIX = { Boxeo: 'BOX', Kickboxing: 'KBX', Funcional: 'FUN', MMA: 'MMA', Taekwondo: 'TKD' };

// Las clases de las próximas semanas a partir de la grilla. El código las identifica: "BOX-20261019-1800"
const scheduledEvents = () => {
    const firstMonday = mondayOf(dayKeyOf(Date.now()));
    const events = [];
    for (let week = 0; week < WEEKS; week++) {
        const monday = addDays(firstMonday, week * 7);
        for (const slot of WEEKLY_SCHEDULE) {
            const type = CLASS_TYPES[slot.type];
            const dayKey = addDays(monday, slot.day);
            const start = new Date(`${dayKey}T${slot.time}:00-03:00`);
            events.push({
                code: `${PREFIX[type.category]}-${dayKey.replaceAll('-', '')}-${slot.time.replace(':', '')}`,
                title: type.title,
                description: type.description,
                category: type.category,
                location: type.location,
                capacity: type.capacity,
                price: type.price,
                status: 'published',
                date: start.toISOString(),
                endDate: new Date(start.getTime() + type.minutes * 60 * 1000).toISOString(),
                teacher: slot.teacher
            });
        }
    }
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
        users[data.email.split('@')[0]] = existing ?? await userRepository.create({ ...data, password: createHash(password) });
        logger.info(`${existing ? 'Ya existía' : 'Creado'} el usuario ${data.email} (${data.role})`);
    }

    for (const category of SEED_CATEGORIES) {
        const existing = await categoryRepository.findByName(category.name);
        if (!existing) await categoryRepository.create(category);
        logger.info(`${existing ? 'Ya existía' : 'Creada'} la disciplina ${category.name}`);
    }

    // Las clases se crean con el service, así pasan por las mismas validaciones que la API
    let created = 0;
    let skipped = 0;
    for (const { teacher, ...event } of scheduledEvents()) {
        if (new Date(event.date) <= new Date()) continue;   // la API no deja crear clases en el pasado
        const { total } = await eventRepository.findPaginated({ code: event.code }, { sortField: 'date', sortDir: 1, page: 1, limit: 1 });
        if (total > 0) {
            skipped++;
            continue;
        }
        await eventsService.createEvent(event, users[teacher]);
        created++;
    }
    logger.info(`Clases: ${created} creadas, ${skipped} ya existían`);
};

seed()
    .then(() => logger.info('Seed terminado'))
    .catch((error) => {
        logger.error('Error al ejecutar el seed', error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
