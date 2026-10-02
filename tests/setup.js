// tests/setup.js
// Mocha lo carga ANTES que los tests (ver .mocharc.json). Fija el entorno de test antes de que
// config.js lo lea, y se ocupa de conectar, limpiar y desconectar la base.
import 'dotenv/config';                       // toma MONGO_URL del .env si existe (no pisa variables ya definidas)
import { connectTestDb, resetDb, disconnectTestDb } from './db.js';

process.env.NODE_ENV = 'test';                // en test la cookie no es "secure", así supertest la envía por http
process.env.SECRET ||= 'secreto-solo-para-tests';
process.env.JWT_EXPIRES_IN ||= '1h';

// Los tests usan otra base: <DB_NAME>_test. Nunca tocan la base de desarrollo.
const baseName = process.env.DB_NAME || 'ringo_box_gym';
process.env.DB_NAME = baseName.endsWith('_test') ? baseName : `${baseName}_test`;

if (!process.env.MONGO_URL) {
    throw new Error('Definí MONGO_URL en el .env o como variable de entorno para correr los tests');
}

before(async function () {
    this.timeout(30000);
    await connectTestDb();
    await resetDb();
});

after(async function () {
    this.timeout(30000);
    await resetDb();
    await disconnectTestDb();
});
