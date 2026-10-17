import { expect } from 'chai';
import { EventsService } from '../../src/services/events.service.js';
import { fakeUser, fakeEvent, fakeEventRepo, fakeCategoryRepo, expectAppError, DAY, HOUR } from './fakes.js';

const futureDates = () => {
    const date = new Date(Date.now() + 7 * DAY);
    return { date: date.toISOString(), endDate: new Date(date.getTime() + HOUR).toISOString() };
};

const eventBody = (overrides = {}) => ({
    title: 'Boxeo iniciación',
    description: 'Técnica básica de guardia',
    capacity: 15,
    category: 'Boxeo',
    location: 'Ring principal',
    ...futureDates(),
    ...overrides
});

// Service con un único evento guardado, que devuelven findById y findByIdWithRelations
const serviceWith = (event, categoryOverrides) => new EventsService(
    fakeEventRepo({ findById: async () => event, findByIdWithRelations: async () => event }),
    fakeCategoryRepo(categoryOverrides)
);

describe('EventsService', () => {
    const organizer = fakeUser('organizer');
    const otherOrganizer = fakeUser('organizer');
    const admin = fakeUser('admin');

    describe('createEvent', () => {
        it('toma el organizer de la sesión y no del body', async () => {
            const service = serviceWith(null);
            const created = await service.createEvent(eventBody({ organizer: 'otro' }), organizer);

            expect(created.organizer).to.equal(organizer._id);
            expect(created.status).to.equal('draft');   // estado por defecto
            expect(created.capacity).to.equal(15);
        });

        it('fecha pasada → 400', async () => {
            const past = new Date(Date.now() - DAY);
            const body = eventBody({ date: past.toISOString(), endDate: new Date(past.getTime() + HOUR).toISOString() });
            await expectAppError(serviceWith(null).createEvent(body, organizer), 400);
        });

        it('cupo inválido o categoría inexistente → 400', async () => {
            await expectAppError(serviceWith(null).createEvent(eventBody({ capacity: 0 }), organizer), 400);
            await expectAppError(
                serviceWith(null, { findByName: async () => null }).createEvent(eventBody(), organizer),
                400
            );
        });

        it('no se puede crear directamente como cancelled o finished → 400', async () => {
            await expectAppError(serviceWith(null).createEvent(eventBody({ status: 'finished' }), organizer), 400);
        });
    });

    describe('getEventById', () => {
        it('un draft ajeno no es visible → 404', async () => {
            const draft = fakeEvent({ status: 'draft', organizer: organizer._id });
            await expectAppError(serviceWith(draft).getEventById(draft._id, otherOrganizer), 404);
            await expectAppError(serviceWith(draft).getEventById(draft._id, null), 404);
        });

        it('el dueño y el admin sí ven el draft', async () => {
            const draft = fakeEvent({ status: 'draft', organizer: organizer._id });
            expect(await serviceWith(draft).getEventById(draft._id, organizer)).to.equal(draft);
            expect(await serviceWith(draft).getEventById(draft._id, admin)).to.equal(draft);
        });
    });

    describe('updateEvent', () => {
        it('organizer que no es dueño → 403, admin puede', async () => {
            const event = fakeEvent({ organizer: organizer._id });
            await expectAppError(serviceWith(event).updateEvent(event._id, { title: 'Ajeno' }, otherOrganizer), 403);

            const updated = await serviceWith(event).updateEvent(event._id, { title: 'Nuevo título' }, admin);
            expect(updated.title).to.equal('Nuevo título');
        });

        it('evento inexistente → 404', async () => {
            await expectAppError(serviceWith(null).updateEvent('x', { title: 'Nuevo' }, admin), 404);
        });

        it('evento cancelado → 409', async () => {
            const event = fakeEvent({ organizer: organizer._id, status: 'cancelled' });
            await expectAppError(serviceWith(event).updateEvent(event._id, { title: 'Nuevo' }, organizer), 409);
        });

        it('ignora campos no editables (organizer, status) → 400 si no queda ninguno', async () => {
            const event = fakeEvent({ organizer: organizer._id });
            await expectAppError(
                serviceWith(event).updateEvent(event._id, { organizer: 'otro', status: 'finished' }, organizer),
                400
            );
        });
    });

    describe('changeStatus', () => {
        it('draft → published está permitido', async () => {
            const event = fakeEvent({ organizer: organizer._id, status: 'draft' });
            const updated = await serviceWith(event).changeStatus(event._id, 'published', organizer);
            expect(updated.status).to.equal('published');
        });

        it('transiciones no permitidas → 409', async () => {
            const finished = fakeEvent({ organizer: organizer._id, status: 'finished' });
            const cancelled = fakeEvent({ organizer: organizer._id, status: 'cancelled' });
            const draft = fakeEvent({ organizer: organizer._id, status: 'draft' });

            await expectAppError(serviceWith(finished).changeStatus(finished._id, 'published', organizer), 409);
            await expectAppError(serviceWith(cancelled).changeStatus(cancelled._id, 'published', organizer), 409);
            await expectAppError(serviceWith(draft).changeStatus(draft._id, 'finished', organizer), 409);
        });

        it('estado inexistente → 400', async () => {
            const event = fakeEvent({ organizer: organizer._id });
            await expectAppError(serviceWith(event).changeStatus(event._id, 'borrado', organizer), 400);
        });

        it('organizer que no es dueño → 403', async () => {
            const event = fakeEvent({ organizer: organizer._id, status: 'draft' });
            await expectAppError(serviceWith(event).changeStatus(event._id, 'published', otherOrganizer), 403);
        });
    });

    describe('getEvents', () => {
        it('parámetros de paginación u orden inválidos → 400', async () => {
            const service = serviceWith(null);
            await expectAppError(service.getEvents({ page: '0' }), 400);
            await expectAppError(service.getEvents({ limit: '100' }), 400);
            await expectAppError(service.getEvents({ sort: 'password' }), 400);
        });

        it('sin sesión filtra los draft', async () => {
            let receivedFilter;
            const service = new EventsService(
                fakeEventRepo({ findPaginated: async (filter) => { receivedFilter = filter; return { data: [], total: 0 }; } }),
                fakeCategoryRepo()
            );

            const result = await service.getEvents({}, null);

            expect(receivedFilter.$and).to.deep.include({ status: { $ne: 'draft' } });
            expect(result).to.include({ page: 1, limit: 10, total: 0, totalPages: 0 });
        });
    });
});
