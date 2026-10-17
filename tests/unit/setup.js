// tests/unit/setup.js
// Mocha lo carga ANTES que los tests unitarios (ver tests/unit/.mocharc.json).
// Estos tests no usan base de datos: los services reciben repositorios falsos.
process.env.NODE_ENV = 'test';                // el logger queda en silencio
process.env.JWT_SECRET ||= 'secreto-solo-para-tests';
process.env.JWT_EXPIRES_IN ||= '1h';
