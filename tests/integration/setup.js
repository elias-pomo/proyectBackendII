// tests/integration/setup.js
// Mocha lo carga ANTES que los tests (ver tests/integration/.mocharc.json). Fija el entorno de test antes de que
// config.js lo lea, y se ocupa de conectar, limpiar y desconectar la base.
import 'dotenv/config';                       // toma MONGO_URL del .env si existe (no pisa variables ya definidas)
import { connectTestDb, resetDb, disconnectTestDb } from './db.js';

process.env.NODE_ENV = 'test';                // en test la cookie no es "secure", así supertest la envía por http
process.env.JWT_SECRET ||= 'secreto-solo-para-tests';
process.env.JWT_EXPIRES_IN ||= '1h';

// Los tests nunca mandan emails reales: sin MAIL_* el MailService solo avisa por consola
['MAIL_HOST', 'MAIL_PORT', 'MAIL_USER', 'MAIL_PASS', 'MAIL_FROM'].forEach((key) => {
    process.env[key] = '';
});

// Los tests usan otra base: <DB_NAME>_test. Nunca tocan la base de desarrollo.
const baseName = process.env.DB_NAME || 'ringo_box_gym';
process.env.DB_NAME = baseName.endsWith('_test') ? baseName : `${baseName}_test`;

// Sin MONGO_URL no hay base contra la cual probar: se saltean los tests de integración
// (quedan como pendientes) en vez de cortar toda la corrida con un error
const hasDatabase = Boolean(process.env.MONGO_URL);

before(async function () {
    if (!hasDatabase) {
        process.stderr.write('\n  MONGO_URL no está definida: se saltean los tests de integración. Configurala en el .env para correrlos.\n\n');
        this.skip();
    }
    this.timeout(30000);
    await connectTestDb();
    await resetDb();
});

after(async function () {
    if (!hasDatabase) return;
    this.timeout(30000);
    await resetDb();
    await disconnectTestDb();
});