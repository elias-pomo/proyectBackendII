import { expect } from 'chai';
import { TicketsService } from '../../src/services/tickets.service.js';
import {
    fakeUser, fakeEvent, fakeTicketRepo, fakeEventRepo, fakeCategoryRepo, fakeMail,
    noTransaction, expectAppError, DAY
} from './fakes.js';

// Arma el service con un evento ya "bloqueado" por lockForBooking y repos que se pueden pisar
const buildService = ({ event = fakeEvent(), tickets = {}, category = {}, mail = fakeMail() } = {}) => {
    const service = new TicketsService(
        fakeTicketRepo(tickets),
        fakeEventRepo({ lockForBooking: async () => event, findById: async () => event }),
        fakeCategoryRepo(category),
        mail,
        noTransaction
    );
    return { service, mail, event };
};

describe('TicketsService', () => {
    const user = fakeUser('user');

    describe('createTicket', () => {
        it('crea una inscripción confirmada y envía el email', async () => {
            const { service, mail, event } = buildService();

            const ticket = await service.createTicket(event._id, { quantity: 2 }, user);

            expect(ticket).to.include({ user: user._id, event: event._id, quantity: 2, status: 'confirmed' });
            expect(ticket.reservationCode).to.match(/^RES-[0-9A-F]{8}$/);
            expect(mail.sent).to.have.lengthOf(1);
            expect(mail.sent[0]).to.include({ type: 'confirmation', to: user.email });
        });

        it('sin quantity reserva 1 lugar', async () => {
            const { service, event } = buildService();
            const ticket = await service.createTicket(event._id, {}, user);
            expect(ticket.quantity).to.equal(1);
        });

        it('evento inexistente → 404', async () => {
            const { service } = buildService({ event: null });
            await expectAppError(service.createTicket('x', {}, user), 404);
        });

        it('evento cancelado, finalizado o en borrador → 409', async () => {
            for (const status of ['cancelled', 'finished', 'draft']) {
                const { service, event } = buildService({ event: fakeEvent({ status }) });
                await expectAppError(service.createTicket(event._id, {}, user), 409);
            }
        });

        it('clase que ya empezó → 409', async () => {
            const { service, event } = buildService({ event: fakeEvent({ date: new Date(Date.now() - DAY) }) });
            await expectAppError(service.createTicket(event._id, {}, user), 409);
        });

        it('quantity inválida → 400', async () => {
            const { service, event } = buildService();
            for (const quantity of [0, -3, 1.5, 'dos', '']) {
                await expectAppError(service.createTicket(event._id, { quantity }, user), 400);
            }
        });

        it('supera el máximo por inscripción de la categoría → 400', async () => {
            const { service, event } = buildService({
                category: { findById: async () => ({ _id: 'cat1', name: 'Sparring', maxQuantityPerTicket: 1 }) }
            });
            await expectAppError(service.createTicket(event._id, { quantity: 2 }, user), 400);
        });

        it('inscripción activa duplicada → 409', async () => {
            const { service, event } = buildService({ tickets: { findActiveByUserAndEvent: async () => ({ _id: 't1' }) } });
            await expectAppError(service.createTicket(event._id, {}, user), 409);
        });

        it('sin cupo suficiente → 409', async () => {
            const { service, event } = buildService({
                event: fakeEvent({ capacity: 5 }),
                tickets: { countActiveSeats: async () => 4 }
            });

            await expectAppError(service.createTicket(event._id, { quantity: 2 }, user), 409);
            expect((await service.createTicket(event._id, { quantity: 1 }, user)).quantity).to.equal(1);
        });

        it('si falla el email la inscripción igual se crea', async () => {
            const { service, event } = buildService({
                mail: fakeMail({ sendTicketConfirmation: async () => { throw new Error('SMTP caído'); } })
            });

            const ticket = await service.createTicket(event._id, {}, user);

            expect(ticket.status).to.equal('confirmed');
        });
    });

    describe('getEventTickets', () => {
        it('devuelve los tickets y el resumen de cupos al dueño del evento', async () => {
            const organizer = fakeUser('organizer');
            const { service, event } = buildService({
                event: fakeEvent({ organizer: organizer._id, capacity: 10 }),
                tickets: { findByEvent: async () => [{ _id: 't1' }], countActiveSeats: async () => 3 }
            });

            const result = await service.getEventTickets(event._id, organizer);

            expect(result.tickets).to.have.lengthOf(1);
            expect(result.summary).to.deep.equal({ capacity: 10, taken: 3, available: 7 });
        });

        it('organizer que no es dueño → 403', async () => {
            const { service, event } = buildService({ event: fakeEvent({ organizer: 'otro' }) });
            await expectAppError(service.getEventTickets(event._id, fakeUser('organizer')), 403);
        });

        it('evento inexistente → 404', async () => {
            const { service } = buildService({ event: null });
            await expectAppError(service.getEventTickets('x', fakeUser('admin')), 404);
        });
    });

    describe('cancelTicket', () => {
        const ticketOf = (owner, overrides = {}) => ({ _id: 't1', user: owner._id, event: 'e1', status: 'confirmed', ...overrides });

        it('el dueño cancela su ticket', async () => {
            const { service } = buildService({ tickets: { findById: async () => ticketOf(user) } });
            const cancelled = await service.cancelTicket('t1', user);
            expect(cancelled.status).to.equal('cancelled');
        });

        it('cancelar el ticket de otra persona → 403', async () => {
            const { service } = buildService({ tickets: { findById: async () => ticketOf(user) } });
            await expectAppError(service.cancelTicket('t1', fakeUser('user')), 403);
        });

        it('un admin puede cancelar el ticket de otra persona', async () => {
            const { service } = buildService({ tickets: { findById: async () => ticketOf(user) } });
            const cancelled = await service.cancelTicket('t1', fakeUser('admin'));
            expect(cancelled.status).to.equal('cancelled');
        });

        it('ticket ya cancelado → 409', async () => {
            const { service } = buildService({ tickets: { findById: async () => ticketOf(user, { status: 'cancelled' }) } });
            await expectAppError(service.cancelTicket('t1', user), 409);
        });

        it('otro pedido lo canceló primero → 409', async () => {
            const { service } = buildService({
                tickets: { findById: async () => ticketOf(user), cancelTicket: async () => null }
            });
            await expectAppError(service.cancelTicket('t1', user), 409);
        });

        it('ticket inexistente → 404', async () => {
            const { service } = buildService();
            await expectAppError(service.cancelTicket('x', user), 404);
        });
    });
});
