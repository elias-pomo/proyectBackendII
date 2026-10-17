import request from 'supertest';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';

const PASSWORD = 'Password123!';

const newUser = () => ({
    first_name: 'Elias',
    last_name: 'Coder',
    email: `test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@mail.com`,
    password: PASSWORD
});

// Valor de la cookie currentUser dentro de los headers set-cookie
const currentUserCookie = (res) =>
    (res.headers['set-cookie'] ?? []).find((cookie) => cookie.startsWith('currentUser='));

describe('Sesiones', () => {
    describe('POST /api/sessions/register', () => {
        it('debe registrar un usuario correctamente y devolver su email', async () => {
            const nuevoUsuario = newUser();

            const response = await request(app)
                .post('/api/sessions/register')
                .send(nuevoUsuario);

            expect(response.status).to.equal(201);
            expect(response.body).to.have.property('payload');
            expect(response.body.payload.email).to.equal(nuevoUsuario.email);
            expect(response.body.payload).to.not.have.property('password');
        });

        it('ignora el role enviado en el body: siempre crea un user', async () => {
            const response = await request(app)
                .post('/api/sessions/register')
                .send({ ...newUser(), role: 'admin' });

            expect(response.status).to.equal(201);
            expect(response.body.payload.role).to.equal('user');
        });
    });

    describe('Flujo de sesión: registro → login → current → logout → current', () => {
        it('después del logout, /current responde 401', async () => {
            const agent = request.agent(app);   // guarda la cookie entre requests, como un navegador
            const user = newUser();

            expect((await agent.post('/api/sessions/register').send(user)).status).to.equal(201);

            const login = await agent.post('/api/sessions/login').send({ email: user.email, password: PASSWORD });
            expect(login.status).to.equal(200);
            const cookie = currentUserCookie(login);
            expect(cookie).to.match(/HttpOnly/i);

            // El JWT no lleva password
            const token = cookie.split(';')[0].split('=')[1];
            expect(jwt.decode(token)).to.not.have.property('password');

            const current = await agent.get('/api/sessions/current');
            expect(current.status).to.equal(200);
            expect(current.body.payload.email).to.equal(user.email);

            const logout = await agent.post('/api/sessions/logout');
            expect(logout.status).to.equal(200);

            const afterLogout = await agent.get('/api/sessions/current');
            expect(afterLogout.status).to.equal(401);
            expect(afterLogout.body).to.deep.equal({ status: 'error', message: 'No autenticado' });
        });

        it('logout sin sesión → 401', async () => {
            const res = await request(app).post('/api/sessions/logout');
            expect(res.status).to.equal(401);
        });
    });
});
