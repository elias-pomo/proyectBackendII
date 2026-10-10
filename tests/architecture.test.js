import request from 'supertest';
import mongoose from 'mongoose';
import { expect } from 'chai';
import app from '../src/app.js';
import { resetDb } from './db.js';
import { api, createUser, createCategory, createEvent, eventPayload } from './helpers.js';

const PASSWORD = 'Password123!';

// Detecta tanto la clave "password" como un hash de bcrypt filtrado en cualquier parte de la respuesta
const leaksPassword = (body) => /password|\$2[aby]\$/i.test(JSON.stringify(body));

const enroll = (user, eventId, quantity = 1) =>
    api('post', `/api/events/${eventId}/tickets`, { user, body: { quantity } });

describe('Arquitectura en capas: casos de aceptación', function () {
    this.timeout(30000);

    let organizer, category;

    before(async () => {
        await resetDb();
        organizer = await createUser('organizer');
        category = await createCategory('Boxeo');
    });
    after(async () => {
        await resetDb();   // deja la base limpia para los tests que corren después
    });

    describe('1. Flujo completo', () => {
        it('registro → login → crear evento → inscribirse → mis tickets → cancelar', async () => {
            const email = `flow_${Date.now()}@test.com`;

            const registered = await request(app)
                .post('/api/sessions/register')
                .send({ first_name: 'Flow', last_name: 'Tester', email, password: PASSWORD });
            expect(registered.status).to.equal(201);
            expect(registered.body.payload).to.include({ email, role: 'user' });

            const login = await request(app).post('/api/sessions/login').send({ email, password: PASSWORD });
            expect(login.status).to.equal(200);
            const cookie = login.headers['set-cookie'];
            expect(cookie).to.be.an('array');

            const created = await api('post', '/api/events', { user: organizer, body: eventPayload({ capacity: 5 }) });
            expect(created.status).to.equal(201);
            const eventId = created.body.payload._id;

            const enrolled = await request(app)
                .post(`/api/events/${eventId}/tickets`)
                .set('Cookie', cookie)
                .send({ quantity: 2 });
            expect(enrolled.status).to.equal(201);
            expect(enrolled.body.payload.status).to.equal('confirmed');
            const ticketId = enrolled.body.payload._id;

            const mine = await request(app).get('/api/tickets/my-tickets').set('Cookie', cookie);
            expect(mine.status).to.equal(200);
            expect(mine.body.payload.map((ticket) => ticket._id)).to.include(ticketId);

            const cancelled = await request(app).patch(`/api/tickets/${ticketId}/cancel`).set('Cookie', cookie);
            expect(cancelled.status).to.equal(200);
            expect(cancelled.body.payload.status).to.equal('cancelled');
        });
    });

    describe('2. /current no expone password', () => {
        it('devuelve solo _id, email y role', async () => {
            const user = await createUser('user');

            const res = await api('get', '/api/sessions/current', { user });

            expect(res.status).to.equal(200);
            expect(Object.keys(res.body.payload)).to.have.members(['_id', 'email', 'role']);
            expect(leaksPassword(res.body)).to.equal(false);
        });

        it('register y login tampoco exponen password', async () => {
            const email = `dto_${Date.now()}@test.com`;
            const registered = await request(app)
                .post('/api/sessions/register')
                .send({ first_name: 'Dto', last_name: 'Tester', email, password: PASSWORD });
            const login = await request(app).post('/api/sessions/login').send({ email, password: PASSWORD });

            expect(leaksPassword(registered.body)).to.equal(false);
            expect(leaksPassword(login.body)).to.equal(false);
        });
    });

    describe('3. Ticket con populate no expone password del usuario', () => {
        it('el listado de inscriptos de un evento filtra los datos del usuario', async () => {
            const event = await createEvent({ organizer, category });
            const user = await createUser('user');
            expect((await enroll(user, event._id)).status).to.equal(201);

            const res = await api('get', `/api/events/${event._id}/tickets`, { user: organizer });

            expect(res.status).to.equal(200);
            const [ticket] = res.body.payload;
            expect(ticket.user).to.have.property('email', user.email);
            expect(ticket.user).to.not.have.property('password');
            expect(leaksPassword(res.body)).to.equal(false);
        });

        it('mis tickets filtra los datos del evento poblado', async () => {
            const event = await createEvent({ organizer, category });
            const user = await createUser('user');
            await enroll(user, event._id);

            const res = await api('get', '/api/tickets/my-tickets', { user });

            expect(res.status).to.equal(200);
            expect(res.body.payload[0].event).to.have.property('title', event.title);
            expect(res.body.payload[0].event).to.not.have.property('organizer');
            expect(leaksPassword(res.body)).to.equal(false);
        });

        it('la lista de usuarios para admin no incluye password', async () => {
            const admin = await createUser('admin');

            const res = await api('get', '/api/users', { user: admin });

            expect(res.status).to.equal(200);
            expect(res.body.payload).to.not.be.empty;
            expect(leaksPassword(res.body)).to.equal(false);
        });
    });

    describe('4. Errores de negocio con el código HTTP correcto (nunca 500)', () => {
        it('evento cancelado → 409', async () => {
            const event = await createEvent({ organizer, category, status: 'cancelled' });
            const res = await enroll(await createUser('user'), event._id);

            expect(res.status).to.equal(409);
            expect(res.body).to.include({ status: 'error' });
        });

        it('inscripción duplicada → 409', async () => {
            const event = await createEvent({ organizer, category });
            const user = await createUser('user');

            expect((await enroll(user, event._id)).status).to.equal(201);
            expect((await enroll(user, event._id)).status).to.equal(409);
        });

        it('sin cupo suficiente → 409', async () => {
            const event = await createEvent({ organizer, category, capacity: 1 });

            expect((await enroll(await createUser('user'), event._id)).status).to.equal(201);
            expect((await enroll(await createUser('user'), event._id)).status).to.equal(409);
        });

        it('evento inexistente → 404', async () => {
            const res = await enroll(await createUser('user'), new mongoose.Types.ObjectId());
            expect(res.status).to.equal(404);
        });

        it('id mal formado → 400', async () => {
            const res = await enroll(await createUser('user'), 'no-es-un-id');
            expect(res.status).to.equal(400);
        });

        it('cantidad inválida → 400', async () => {
            const event = await createEvent({ organizer, category });
            const res = await enroll(await createUser('user'), event._id, -3);
            expect(res.status).to.equal(400);
        });

        it('registro con email repetido → 409 y con campos faltantes → 400', async () => {
            const user = await createUser('user');

            const duplicated = await request(app)
                .post('/api/sessions/register')
                .send({ first_name: 'Dup', last_name: 'Licado', email: user.email, password: PASSWORD });
            const incomplete = await request(app)
                .post('/api/sessions/register')
                .send({ email: `incompleto_${Date.now()}@test.com` });

            expect(duplicated.status).to.equal(409);
            expect(incomplete.status).to.equal(400);
        });

        it('credenciales inválidas → 401', async () => {
            const user = await createUser('user');
            const res = await request(app).post('/api/sessions/login').send({ email: user.email, password: 'incorrecta' });
            expect(res.status).to.equal(401);
        });
    });

    describe('5. Rutas protegidas: 401 sin sesión, 403 sin permisos', () => {
        it('sin sesión → 401', async () => {
            const event = await createEvent({ organizer, category });

            const responses = await Promise.all([
                api('get', '/api/sessions/current'),
                api('get', '/api/tickets/my-tickets'),
                api('post', '/api/events', { body: eventPayload() }),
                api('post', `/api/events/${event._id}/tickets`, { body: {} }),
                api('get', '/api/users')
            ]);

            responses.forEach((res) => expect(res.status).to.equal(401));
        });

        it('con sesión pero sin permisos → 403', async () => {
            const user = await createUser('user');
            const otherOrganizer = await createUser('organizer');
            const event = await createEvent({ organizer, category });

            const responses = await Promise.all([
                api('post', '/api/events', { user, body: eventPayload() }),
                api('get', '/api/users', { user: otherOrganizer }),
                api('put', `/api/events/${event._id}`, { user: otherOrganizer, body: { title: 'Cambio ajeno' } }),
                api('get', `/api/events/${event._id}/tickets`, { user })
            ]);

            responses.forEach((res) => expect(res.status).to.equal(403));
        });

        it('cancelar el ticket de otra persona → 403', async () => {
            const event = await createEvent({ organizer, category });
            const owner = await createUser('user');
            const stranger = await createUser('user');
            const created = await enroll(owner, event._id);

            const res = await api('patch', `/api/tickets/${created.body.payload._id}/cancel`, { user: stranger });

            expect(res.status).to.equal(403);
        });

        it('una ruta /api inexistente → 404 con el mismo formato de error', async () => {
            const res = await api('get', '/api/no-existe');
            expect(res.status).to.equal(404);
            expect(res.body).to.have.keys(['status', 'message']);
        });
    });
});