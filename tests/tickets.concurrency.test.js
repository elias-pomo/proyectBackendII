// tests/tickets.concurrency.test.js
// Disparan pedidos simultáneos contra la API para comprobar que el cupo y los duplicados
// quedan protegidos por la transacción. Requieren un replica set (Atlas lo es).
import { expect } from 'chai';
import { ticketModel } from '../src/dao/models/ticket.model.js';
import { ACTIVE_TICKET_STATUSES } from '../src/constants/statuses.js';
import { resetDb, resetEvents, resetTickets, supportsTransactions } from './db.js';
import { api, createUser, createCategory, createEvent } from './helpers.js';

const enroll = (user, eventId, quantity = 1) =>
    api('post', `/api/events/${eventId}/tickets`, { user, body: { quantity } });

const cancel = (user, ticketId) => api('patch', `/api/tickets/${ticketId}/cancel`, { user });

// [201, 409, 201, ...] -> { 201: 2, 409: 1 }
const countByStatus = (responses) =>
    responses.reduce((acc, res) => ({ ...acc, [res.status]: (acc[res.status] ?? 0) + 1 }), {});

const activeSeats = async (eventId) => {
    const tickets = await ticketModel.find({ event: eventId, status: { $in: ACTIVE_TICKET_STATUSES } }).lean();
    return tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
};

const createUsers = (count) => Promise.all(Array.from({ length: count }, () => createUser('user')));

describe('Tickets: inscripciones concurrentes', function () {
    this.timeout(60000);

    let organizer, category;

    before(async function () {
        if (!(await supportsTransactions())) {
            this.skip();
        }
        await resetDb();
        organizer = await createUser('organizer');
        category = await createCategory('Boxeo');
    });

    beforeEach(async () => {
        await resetEvents();
        await resetTickets();
    });

    it('con cupo para 3, de 8 inscripciones simultáneas entran exactamente 3', async () => {
        const event = await createEvent({ organizer, category, capacity: 3 });
        const users = await createUsers(8);

        const responses = await Promise.all(users.map((user) => enroll(user, event._id)));

        expect(countByStatus(responses)).to.deep.equal({ 201: 3, 409: 5 });
        expect(await activeSeats(event._id)).to.equal(3);
    });

    it('con lugares de a 2 y cupo 5, entran solo 2 inscripciones y nunca se supera el cupo', async () => {
        const event = await createEvent({ organizer, category, capacity: 5 });
        const users = await createUsers(6);

        const responses = await Promise.all(users.map((user) => enroll(user, event._id, 2)));

        expect(countByStatus(responses)).to.deep.equal({ 201: 2, 409: 4 });
        expect(await activeSeats(event._id)).to.equal(4);
    });

    it('un mismo usuario que envía el pedido varias veces a la vez queda con un solo ticket', async () => {
        const event = await createEvent({ organizer, category, capacity: 10 });
        const [user] = await createUsers(1);

        const responses = await Promise.all(Array.from({ length: 5 }, () => enroll(user, event._id)));

        expect(countByStatus(responses)).to.deep.equal({ 201: 1, 409: 4 });
        expect(await ticketModel.countDocuments({ event: event._id })).to.equal(1);
    });

    it('cancelar el mismo ticket varias veces a la vez: una sola cancelación efectiva', async () => {
        const event = await createEvent({ organizer, category, capacity: 2 });
        const [user] = await createUsers(1);

        const created = await enroll(user, event._id);
        expect(created.status).to.equal(201);
        const ticketId = created.body.payload._id;

        const responses = await Promise.all([1, 2, 3].map(() => cancel(user, ticketId)));

        expect(countByStatus(responses)).to.deep.equal({ 200: 1, 409: 2 });
        expect(await activeSeats(event._id)).to.equal(0);
    });

    it('al cancelar se libera el cupo y otra persona puede tomarlo', async () => {
        const event = await createEvent({ organizer, category, capacity: 1 });
        const [first, second] = await createUsers(2);

        const created = await enroll(first, event._id);
        expect(created.status).to.equal(201);
        expect((await enroll(second, event._id)).status).to.equal(409);

        expect((await cancel(first, created.body.payload._id)).status).to.equal(200);
        expect((await enroll(second, event._id)).status).to.equal(201);
        expect(await activeSeats(event._id)).to.equal(1);
    });
});