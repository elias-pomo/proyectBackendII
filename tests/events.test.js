// tests/events.test.js
import { expect } from 'chai';
import mongoose from 'mongoose';
import { eventModel } from '../src/dao/models/event.model.js';
import { resetEvents } from './db.js';
import { api, createUser, createCategory, createEvent, eventPayload, DAY, HOUR } from './helpers.js';

const randomId = () => new mongoose.Types.ObjectId().toString();
const patchStatus = (user, id, status) => api('patch', `/api/events/${id}/status`, { user, body: { status } });
const list = (params = {}, user) => api('get', `/api/events?${new URLSearchParams(params)}`, { user });

describe('Eventos', () => {
    let admin, organizer, otherOrganizer, user, boxeo, karate;

    before(async () => {
        [admin, organizer, otherOrganizer, user] = await Promise.all([
            createUser('admin'),
            createUser('organizer'),
            createUser('organizer'),
            createUser('user')
        ]);
        boxeo = await createCategory('Boxeo');
        karate = await createCategory('Karate');
    });

    // ---------------------------------------------------------------------------------------
    describe('Creación: POST /api/events', () => {
        beforeEach(resetEvents);

        it('sin sesión responde 401', async () => {
            const res = await api('post', '/api/events', { body: eventPayload() });
            expect(res.status).to.equal(401);
        });

        it('con rol user responde 403', async () => {
            const res = await api('post', '/api/events', { user, body: eventPayload() });
            expect(res.status).to.equal(403);
        });

        it('con rol organizer crea el evento y lo asigna a su sesión', async () => {
            const res = await api('post', '/api/events', { user: organizer, body: eventPayload() });
            expect(res.status).to.equal(201);
            expect(res.body.status).to.equal('success');
            expect(res.body.payload.organizer).to.equal(String(organizer._id));
            expect(res.body.payload.status).to.equal('published');
        });

        it('ignora un organizer enviado en el body', async () => {
            const body = eventPayload({ organizer: String(otherOrganizer._id) });
            const res = await api('post', '/api/events', { user: organizer, body });
            expect(res.status).to.equal(201);
            expect(res.body.payload.organizer).to.equal(String(organizer._id));
        });

        it('si no se envía status, el evento queda en draft', async () => {
            const res = await api('post', '/api/events', { user: organizer, body: eventPayload({ status: undefined }) });
            expect(res.status).to.equal(201);
            expect(res.body.payload.status).to.equal('draft');
        });

        it('rechaza una fecha pasada (400)', async () => {
            const past = new Date(Date.now() - DAY);
            const body = eventPayload({
                date: past.toISOString(),
                endDate: new Date(past.getTime() + HOUR).toISOString()
            });
            const res = await api('post', '/api/events', { user: organizer, body });
            expect(res.status).to.equal(400);
            expect(res.body.message).to.match(/fecha pasada/i);
        });

        it('rechaza un endDate anterior a date (400)', async () => {
            const date = new Date(Date.now() + 7 * DAY);
            const body = eventPayload({
                date: date.toISOString(),
                endDate: new Date(date.getTime() - HOUR).toISOString()
            });
            const res = await api('post', '/api/events', { user: organizer, body });
            expect(res.status).to.equal(400);
        });

        [0, -3, 2.5, 'abc'].forEach((capacity) => {
            it(`rechaza capacity ${JSON.stringify(capacity)} (400)`, async () => {
                const res = await api('post', '/api/events', { user: organizer, body: eventPayload({ capacity }) });
                expect(res.status).to.equal(400);
            });
        });

        it('rechaza un price negativo (400)', async () => {
            const res = await api('post', '/api/events', { user: organizer, body: eventPayload({ price: -5 }) });
            expect(res.status).to.equal(400);
        });

        it('rechaza una categoría inexistente (400)', async () => {
            const res = await api('post', '/api/events', { user: organizer, body: eventPayload({ category: 'Yoga' }) });
            expect(res.status).to.equal(400);
            expect(res.body.message).to.match(/inexistente/i);
        });

        it('rechaza campos obligatorios faltantes (400)', async () => {
            const res = await api('post', '/api/events', { user: organizer, body: eventPayload({ location: undefined }) });
            expect(res.status).to.equal(400);
        });

        ['finished', 'cancelled'].forEach((status) => {
            it(`no permite crear un evento directamente en ${status} (400)`, async () => {
                const res = await api('post', '/api/events', { user: organizer, body: eventPayload({ status }) });
                expect(res.status).to.equal(400);
            });
        });
    });

    // ---------------------------------------------------------------------------------------
    describe('Transiciones de estado: PATCH /api/events/:id/status', () => {
        beforeEach(resetEvents);

        const allowed = [
            ['draft', 'published'],
            ['draft', 'cancelled'],
            ['published', 'cancelled'],
            ['published', 'finished']
        ];
        const forbidden = [
            ['draft', 'finished'],
            ['published', 'draft'],
            ['cancelled', 'published'],
            ['cancelled', 'finished'],
            ['finished', 'published'],
            ['finished', 'cancelled']
        ];

        allowed.forEach(([from, to]) => {
            it(`permite ${from} → ${to}`, async () => {
                const event = await createEvent({ organizer, category: boxeo, status: from });
                const res = await patchStatus(organizer, event._id, to);

                expect(res.status).to.equal(200);
                expect(res.body.payload.status).to.equal(to);
                expect((await eventModel.findById(event._id).lean()).status).to.equal(to);
            });
        });

        forbidden.forEach(([from, to]) => {
            it(`rechaza ${from} → ${to} (409) y no cambia el estado`, async () => {
                const event = await createEvent({ organizer, category: boxeo, status: from });
                const res = await patchStatus(organizer, event._id, to);

                expect(res.status).to.equal(409);
                expect((await eventModel.findById(event._id).lean()).status).to.equal(from);
            });
        });

        it('un evento cancelado no puede cambiar de estado (mensaje claro)', async () => {
            const event = await createEvent({ organizer, category: boxeo, status: 'cancelled' });
            const res = await patchStatus(organizer, event._id, 'published');
            expect(res.status).to.equal(409);
            expect(res.body.message).to.match(/cancelado/i);
        });

        it('no se puede publicar un evento finalizado (mensaje claro)', async () => {
            const event = await createEvent({ organizer, category: boxeo, status: 'finished' });
            const res = await patchStatus(organizer, event._id, 'published');
            expect(res.status).to.equal(409);
            expect(res.body.message).to.match(/finalizado/i);
        });

        it('no se puede publicar un borrador cuya fecha ya pasó (409)', async () => {
            const date = new Date(Date.now() - DAY);
            const event = await createEvent({
                organizer, category: boxeo, status: 'draft',
                date, endDate: new Date(date.getTime() + HOUR)
            });
            const res = await patchStatus(organizer, event._id, 'published');
            expect(res.status).to.equal(409);
        });

        it('rechaza un status inválido (400)', async () => {
            const event = await createEvent({ organizer, category: boxeo });
            const res = await patchStatus(organizer, event._id, 'xxx');
            expect(res.status).to.equal(400);
        });

        it('un evento cancelado no puede modificarse con PUT (409)', async () => {
            const event = await createEvent({ organizer, category: boxeo, status: 'cancelled' });
            const res = await api('put', `/api/events/${event._id}`, { user: organizer, body: { title: 'Nuevo título' } });
            expect(res.status).to.equal(409);
        });
    });

    // ---------------------------------------------------------------------------------------
    describe('Listado: GET /api/events (filtros, paginación y orden)', () => {
        let base, firstBoxeo, draft;
        const at = (n) => new Date(base + n * DAY);
        const slot = (n) => ({ date: at(n), endDate: new Date(at(n).getTime() + HOUR) });

        // Datos fijos: 7 boxeo + 3 karate publicados, 1 borrador, 1 cancelado y 1 finalizado
        // (12 eventos visibles para el público, 13 contando el borrador)
        before(async () => {
            await resetEvents();
            base = Date.now() + DAY;

            for (let n = 1; n <= 7; n++) {
                const event = await createEvent({
                    organizer, category: boxeo, title: `Boxeo ${n}`, location: 'Ring principal', ...slot(n)
                });
                if (n === 1) firstBoxeo = event;
            }
            for (let n = 8; n <= 10; n++) {
                await createEvent({
                    organizer, category: karate, title: `Karate ${n}`, location: 'Salón de artes marciales', ...slot(n)
                });
            }
            draft = await createEvent({ organizer, category: boxeo, title: 'Borrador de boxeo', status: 'draft', ...slot(11) });
            await createEvent({ organizer, category: karate, title: 'Karate cancelado', status: 'cancelled', ...slot(12) });
            await createEvent({ organizer, category: boxeo, title: 'Boxeo finalizado', status: 'finished', ...slot(13) });
        });

        it('es público y responde data, page, limit, total y totalPages', async () => {
            const res = await list();
            expect(res.status).to.equal(200);
            expect(res.body).to.include.keys('data', 'page', 'limit', 'total', 'totalPages');
            expect(res.body.total).to.equal(12);
            expect(res.body.data.map((e) => e.title)).to.not.include('Borrador de boxeo');
        });

        it('usa page 1 y limit 10 por defecto', async () => {
            const res = await list();
            expect(res.body.page).to.equal(1);
            expect(res.body.limit).to.equal(10);
            expect(res.body.data).to.have.length(10);
            expect(res.body.totalPages).to.equal(2);
        });

        it('filtra por status', async () => {
            const res = await list({ status: 'published' });
            expect(res.body.total).to.equal(10);
            res.body.data.forEach((e) => expect(e.status).to.equal('published'));
        });

        it('filtra por category sin distinguir mayúsculas', async () => {
            const res = await list({ status: 'published', category: 'karate' });
            expect(res.body.total).to.equal(3);
            res.body.data.forEach((e) => expect(e.category.name).to.equal('Karate'));
        });

        it('una categoría inexistente devuelve una lista vacía', async () => {
            const res = await list({ category: 'Yoga' });
            expect(res.status).to.equal(200);
            expect(res.body.total).to.equal(0);
            expect(res.body.data).to.have.length(0);
        });

        it('filtra por location (contiene, sin distinguir mayúsculas)', async () => {
            expect((await list({ status: 'published', location: 'RING' })).body.total).to.equal(7);
            expect((await list({ status: 'published', location: 'artes marciales' })).body.total).to.equal(3);
        });

        it('filtra por rango de fechas con límites inclusivos', async () => {
            const res = await list({
                status: 'published', category: 'Boxeo',
                dateFrom: at(2).toISOString(), dateTo: at(4).toISOString()
            });
            expect(res.status).to.equal(200);
            expect(res.body.data.map((e) => e.title)).to.deep.equal(['Boxeo 2', 'Boxeo 3', 'Boxeo 4']);
        });

        it('acepta fechas simples (YYYY-MM-DD) en dateFrom y dateTo', async () => {
            expect((await list({ status: 'published', dateFrom: '2000-01-01', dateTo: '2100-12-31' })).body.total).to.equal(10);
            expect((await list({ dateFrom: '2100-01-01' })).body.total).to.equal(0);
            expect((await list({ dateTo: '2000-01-01' })).body.total).to.equal(0);
        });

        it('pagina: página 2 con limit 3', async () => {
            const res = await list({ status: 'published', category: 'Boxeo', page: 2, limit: 3 });
            expect(res.body.page).to.equal(2);
            expect(res.body.limit).to.equal(3);
            expect(res.body.data.map((e) => e.title)).to.deep.equal(['Boxeo 4', 'Boxeo 5', 'Boxeo 6']);
            expect(res.body.total).to.equal(7);
            expect(res.body.totalPages).to.equal(3);
        });

        it('la última página trae lo que sobra y una página fuera de rango viene vacía', async () => {
            const last = await list({ status: 'published', category: 'Boxeo', page: 3, limit: 3 });
            expect(last.body.data).to.have.length(1);

            const beyond = await list({ status: 'published', category: 'Boxeo', page: 9, limit: 3 });
            expect(beyond.status).to.equal(200);
            expect(beyond.body.data).to.have.length(0);
            expect(beyond.body.total).to.equal(7);
        });

        it('ordena por date ascendente y, con "-", descendente', async () => {
            const asc = (await list({ status: 'published', sort: 'date' })).body.data.map((e) => new Date(e.date).getTime());
            const desc = (await list({ status: 'published', sort: '-date' })).body.data.map((e) => new Date(e.date).getTime());

            expect(asc).to.deep.equal([...asc].sort((a, b) => a - b));
            expect(desc).to.deep.equal([...desc].sort((a, b) => b - a));
            expect(desc[0]).to.be.greaterThan(asc[0]);
        });

        [
            { limit: '500' }, { limit: '0' }, { page: '0' }, { page: 'abc' },
            { status: 'xxx' }, { sort: 'foo' }, { dateFrom: 'hola' }, { dateTo: '31/12/2026' }
        ].forEach((params) => {
            it(`responde 400 con parámetros inválidos ${JSON.stringify(params)}`, async () => {
                const res = await list(params);
                expect(res.status).to.equal(400);
                expect(res.body.status).to.equal('error');
            });
        });

        describe('visibilidad de borradores', () => {
            it('no los ven los visitantes, los users ni otros organizers', async () => {
                for (const who of [undefined, user, otherOrganizer]) {
                    expect((await list({}, who)).body.total).to.equal(12);
                }
            });

            it('sí los ven su organizer y los admins', async () => {
                expect((await list({}, organizer)).body.total).to.equal(13);
                expect((await list({}, admin)).body.total).to.equal(13);
            });
        });

        describe('GET /api/events/:id', () => {
            it('devuelve un evento publicado con la categoría y el organizer poblados', async () => {
                const res = await api('get', `/api/events/${firstBoxeo._id}`);
                expect(res.status).to.equal(200);
                expect(res.body.payload.category.name).to.equal('Boxeo');
                expect(res.body.payload.organizer.first_name).to.equal('Test');
            });

            it('un borrador da 404 a visitantes y otros usuarios, y 200 a su organizer y al admin', async () => {
                expect((await api('get', `/api/events/${draft._id}`)).status).to.equal(404);
                expect((await api('get', `/api/events/${draft._id}`, { user: otherOrganizer })).status).to.equal(404);
                expect((await api('get', `/api/events/${draft._id}`, { user: organizer })).status).to.equal(200);
                expect((await api('get', `/api/events/${draft._id}`, { user: admin })).status).to.equal(200);
            });

            it('un evento inexistente da 404', async () => {
                const res = await api('get', `/api/events/${randomId()}`);
                expect(res.status).to.equal(404);
            });

            it('un id mal formado da 400', async () => {
                const res = await api('get', '/api/events/abc');
                expect(res.status).to.equal(400);
            });
        });
    });

    // ---------------------------------------------------------------------------------------
    describe('Autorización por rol y propiedad: PUT y PATCH', () => {
        let event;
        const newTitle = { title: 'Título nuevo' };

        beforeEach(async () => {
            await resetEvents();
            event = await createEvent({ organizer, category: boxeo });
        });

        const titleInDb = async () => (await eventModel.findById(event._id).lean()).title;

        it('PUT sin sesión responde 401', async () => {
            const res = await api('put', `/api/events/${event._id}`, { body: newTitle });
            expect(res.status).to.equal(401);
        });

        it('PUT con rol user responde 403', async () => {
            const res = await api('put', `/api/events/${event._id}`, { user, body: newTitle });
            expect(res.status).to.equal(403);
        });

        it('el organizer dueño puede modificar su evento (200)', async () => {
            const res = await api('put', `/api/events/${event._id}`, { user: organizer, body: newTitle });
            expect(res.status).to.equal(200);
            expect(res.body.payload.title).to.equal('Título nuevo');
            expect(await titleInDb()).to.equal('Título nuevo');
        });

        it('otro organizer no puede modificar un evento ajeno (403) y no cambia nada', async () => {
            const original = await titleInDb();
            const res = await api('put', `/api/events/${event._id}`, { user: otherOrganizer, body: newTitle });
            expect(res.status).to.equal(403);
            expect(await titleInDb()).to.equal(original);
        });

        it('el admin puede modificar el evento de otro organizer (200)', async () => {
            const res = await api('put', `/api/events/${event._id}`, { user: admin, body: newTitle });
            expect(res.status).to.equal(200);
            expect(await titleInDb()).to.equal('Título nuevo');
        });

        it('un evento inexistente da 404', async () => {
            const res = await api('put', `/api/events/${randomId()}`, { user: organizer, body: newTitle });
            expect(res.status).to.equal(404);
        });

        it('un id mal formado da 400', async () => {
            const res = await api('put', '/api/events/abc', { user: organizer, body: newTitle });
            expect(res.status).to.equal(400);
        });

        it('no permite cambiar el organizer por el body', async () => {
            const body = { ...newTitle, organizer: String(otherOrganizer._id) };
            const res = await api('put', `/api/events/${event._id}`, { user: organizer, body });
            expect(res.status).to.equal(200);
            expect(String((await eventModel.findById(event._id).lean()).organizer)).to.equal(String(organizer._id));
        });

        it('el estado no se cambia por PUT (400, sin campos válidos)', async () => {
            const res = await api('put', `/api/events/${event._id}`, { user: organizer, body: { status: 'cancelled' } });
            expect(res.status).to.equal(400);
            expect((await eventModel.findById(event._id).lean()).status).to.equal('published');
        });

        it('no permite reprogramar a una fecha pasada (400)', async () => {
            const body = { date: new Date(Date.now() - DAY).toISOString() };
            const res = await api('put', `/api/events/${event._id}`, { user: organizer, body });
            expect(res.status).to.equal(400);
        });

        it('sí permite editar otro campo de una clase que ya comenzó (200)', async () => {
            const date = new Date(Date.now() - DAY);
            const started = await createEvent({
                organizer, category: boxeo, date, endDate: new Date(date.getTime() + HOUR)
            });
            const body = { description: 'Descripción actualizada de la clase' };
            const res = await api('put', `/api/events/${started._id}`, { user: organizer, body });
            expect(res.status).to.equal(200);
        });

        it('PATCH status: sin sesión 401, user 403, otro organizer 403', async () => {
            expect((await patchStatus(undefined, event._id, 'cancelled')).status).to.equal(401);
            expect((await patchStatus(user, event._id, 'cancelled')).status).to.equal(403);
            expect((await patchStatus(otherOrganizer, event._id, 'cancelled')).status).to.equal(403);
            expect((await eventModel.findById(event._id).lean()).status).to.equal('published');
        });

        it('PATCH status: el admin puede cambiar el estado de un evento ajeno (200)', async () => {
            const res = await patchStatus(admin, event._id, 'cancelled');
            expect(res.status).to.equal(200);
            expect(res.body.payload.status).to.equal('cancelled');
        });

        it('PATCH status sobre un evento inexistente da 404', async () => {
            const res = await patchStatus(organizer, randomId(), 'cancelled');
            expect(res.status).to.equal(404);
        });
    });
});
