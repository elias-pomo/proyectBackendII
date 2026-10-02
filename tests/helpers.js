// tests/helpers.js
// Fábricas de datos y atajo para llamar a la API. Se importa desde los tests (después de setup.js).
import request from 'supertest';
import app from '../src/app.js';
import { userModel } from '../src/dao/models/user.model.js';
import { categoryModel } from '../src/dao/models/category.model.js';
import { eventModel } from '../src/dao/models/event.model.js';
import { createHash } from '../src/utils/hash.js';
import { generateToken } from '../src/utils/jwt.js';

export const DAY = 24 * 60 * 60 * 1000;
export const HOUR = 60 * 60 * 1000;

let counter = 0;
const next = () => ++counter;

export const createUser = (role = 'user') => {
    const n = next();
    return userModel.create({
        first_name: 'Test',
        last_name: `${role}${n}`,
        email: `${role}${n}.${Date.now()}@test.com`,
        password: createHash('Password123!'),
        role
    });
};

export const createCategory = (name, color) => categoryModel.create({ name, ...(color && { color }) });

// Inserta directo en la base (sin pasar por el service): sirve para armar estados que la API no deja crear
export const createEvent = ({ organizer, category, ...overrides }) => {
    const n = next();
    const date = new Date(Date.now() + 7 * DAY);
    return eventModel.create({
        code: `TEST-${Date.now().toString(36)}-${n}`.toUpperCase(),
        title: `Clase de prueba ${n}`,
        description: 'Descripción de la clase de prueba',
        category: category._id,
        organizer: organizer._id,
        date,
        endDate: new Date(date.getTime() + HOUR),
        location: 'Ring principal',
        capacity: 10,
        price: 0,
        status: 'published',
        ...overrides
    });
};

// Body válido para POST /api/events
export const eventPayload = (overrides = {}) => {
    const date = new Date(Date.now() + 7 * DAY);
    return {
        title: 'Boxeo iniciación',
        description: 'Técnica básica de guardia y desplazamientos',
        capacity: 15,
        category: 'Boxeo',
        date: date.toISOString(),
        endDate: new Date(date.getTime() + HOUR).toISOString(),
        location: 'Ring principal',
        status: 'published',
        ...overrides
    };
};

// Cookie de sesión de un usuario (el mismo token que emite el login)
export const authCookie = (user) =>
    `currentUser=${generateToken({ _id: user._id, name: user.first_name, email: user.email, role: user.role })}`;

// api('post', '/api/events', { user, body })  ->  request de supertest con cookie y body opcionales
export const api = (method, url, { user, body } = {}) => {
    let req = request(app)[method](url);
    if (user) req = req.set('Cookie', authCookie(user));
    return body === undefined ? req : req.send(body);
};
