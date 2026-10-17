// tests/unit/fakes.js
// Repositorios y servicios falsos: objetos simples con los mismos métodos que usan los services.
// Cada fábrica recibe overrides para cambiar solo el método que le interesa a cada test.
import { expect } from 'chai';
import { AppError } from '../../src/utils/AppError.js';

export const DAY = 24 * 60 * 60 * 1000;
export const HOUR = 60 * 60 * 1000;

let counter = 0;
export const fakeId = () => `id${++counter}`;

export const fakeUser = (role = 'user', overrides = {}) => ({
    _id: fakeId(),
    first_name: 'Test',
    last_name: 'Usuario',
    email: `${role}${counter}@test.com`,
    password: '$2b$10$hashfalsoquenodeberiasalirnunca',
    role,
    ...overrides
});

export const fakeEvent = (overrides = {}) => {
    const date = new Date(Date.now() + 7 * DAY);
    return {
        _id: fakeId(),
        title: 'Clase de prueba',
        category: 'cat1',
        organizer: 'org1',
        date,
        endDate: new Date(date.getTime() + HOUR),
        location: 'Ring principal',
        capacity: 10,
        status: 'published',
        ...overrides
    };
};

// Las escrituras devuelven lo que recibieron, así el test puede revisar qué se guardó
export const fakeUserRepo = (overrides = {}) => ({
    findByEmail: async () => null,
    findById: async () => null,
    findAll: async () => [],
    create: async (data) => ({ _id: fakeId(), ...data }),
    updateRole: async () => null,
    ...overrides
});

export const fakeEventRepo = (overrides = {}) => ({
    findPaginated: async () => ({ data: [], total: 0 }),
    findById: async () => null,
    findByIdWithRelations: async () => null,
    create: async (data) => ({ _id: fakeId(), ...data }),
    update: async (id, data) => ({ _id: id, ...data }),
    lockForBooking: async () => null,
    ...overrides
});

export const fakeTicketRepo = (overrides = {}) => ({
    create: async (data) => ({ _id: fakeId(), ...data }),
    findById: async () => null,
    findByIdWithRelations: async () => null,
    findActiveByUserAndEvent: async () => null,
    countActiveSeats: async () => 0,
    countActiveSeatsByEvents: async () => new Map(),
    findByUser: async () => [],
    findByEvent: async () => [],
    cancelTicket: async (id) => ({ _id: id, status: 'cancelled', cancelledAt: new Date() }),
    ...overrides
});

export const fakeCategoryRepo = (overrides = {}) => ({
    findById: async () => ({ _id: 'cat1', name: 'Boxeo', maxQuantityPerTicket: null }),
    findByName: async (name) => ({ _id: 'cat1', name, maxQuantityPerTicket: null }),
    ...overrides
});

// Guarda los envíos en `sent` para poder verificarlos
export const fakeMail = (overrides = {}) => {
    const sent = [];
    return {
        sent,
        sendTicketConfirmation: async (data) => { sent.push({ type: 'confirmation', ...data }); },
        sendTicketCancellation: async (data) => { sent.push({ type: 'cancellation', ...data }); },
        ...overrides
    };
};

// Transacción falsa: ejecuta el trabajo directamente, sin sesión de MongoDB
export const noTransaction = (work) => work(undefined);

// Espera que la promesa falle con un AppError con ese código HTTP
export const expectAppError = async (promise, status) => {
    try {
        await promise;
    } catch (error) {
        expect(error).to.be.instanceOf(AppError);
        expect(error.status).to.equal(status);
        return error;
    }
    expect.fail(`se esperaba un AppError ${status}, pero no hubo error`);
};

// Detecta tanto la clave "password" como un hash de bcrypt en cualquier parte del objeto
export const leaksPassword = (value) => /password|\$2[aby]\$/i.test(JSON.stringify(value));
