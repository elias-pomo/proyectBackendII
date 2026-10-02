// tests/db.js
// Conexión y limpieza de la base de test. Importa solo modelos (nada que lea config).
import mongoose from 'mongoose';
import { userModel } from '../src/dao/models/user.model.js';
import { categoryModel } from '../src/dao/models/category.model.js';
import { eventModel } from '../src/dao/models/event.model.js';

export const connectTestDb = async () => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URL, { dbName: process.env.DB_NAME });
    } else {
        await mongoose.connection.asPromise();   // app.js ya empezó a conectarse al importarse
    }
};

export const disconnectTestDb = () => mongoose.disconnect();

// Seguridad: se niega a borrar nada si la base conectada no es una base de test
const assertTestDb = () => {
    const name = mongoose.connection.name;
    if (!name?.endsWith('_test')) {
        throw new Error(`Los tests solo pueden limpiar una base que termine en _test (conectada: ${name})`);
    }
};

export const resetEvents = async () => {
    assertTestDb();
    await eventModel.deleteMany({});
};

export const resetDb = async () => {
    assertTestDb();
    await Promise.all([
        userModel.deleteMany({}),
        categoryModel.deleteMany({}),
        eventModel.deleteMany({})
        // cuando haya tickets: ticketModel.deleteMany({})
    ]);
};
