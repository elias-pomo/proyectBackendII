import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';

describe('POST /api/sessions/register', () => {
it('debe registrar un usuario correctamente y devolver su email', async () => {
    const nuevoUsuario = {
    first_name: 'Elias',
    last_name: 'Coder',
    email: `test_${Date.now()}@mail.com`,
    password: 'Password123!'
    };

    const response = await request(app)
    .post('/api/sessions/register')
    .send(nuevoUsuario);

    expect(response.status).to.equal(201);
    expect(response.body).to.have.property('payload');
    expect(response.body.payload.email).to.equal(nuevoUsuario.email);
    expect(response.body.payload).to.not.have.property('password');
});
});
