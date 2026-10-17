import { expect } from 'chai';
import mongoose from 'mongoose';
import { toCurrentUserDTO, toLoginUserDTO, toRegisteredUserDTO, toUserDTO } from '../../src/dto/user.dto.js';
import { toEventDTO } from '../../src/dto/event.dto.js';
import { toTicketDTO } from '../../src/dto/ticket.dto.js';
import { toCategoryDTO } from '../../src/dto/category.dto.js';
import { fakeUser, fakeEvent, leaksPassword } from './fakes.js';

describe('DTOs', () => {
    describe('Usuario', () => {
        const user = { ...fakeUser('organizer'), createdAt: new Date(), updatedAt: new Date(), __v: 0 };

        it('toCurrentUserDTO devuelve solo _id, email y role', () => {
            expect(toCurrentUserDTO(user)).to.deep.equal({ _id: user._id, email: user.email, role: user.role });
        });

        it('ningún DTO de usuario expone password', () => {
            [toCurrentUserDTO, toLoginUserDTO, toRegisteredUserDTO, toUserDTO].forEach((toDTO) => {
                const dto = toDTO(user);
                expect(dto).to.not.have.property('password');
                expect(leaksPassword(dto)).to.equal(false);
            });
        });

        it('toUserDTO no deja pasar campos internos que no están en la lista blanca', () => {
            expect(toUserDTO(user)).to.not.have.property('__v');
        });
    });

    describe('Evento', () => {
        it('filtra la categoría y el organizer poblados', () => {
            const event = fakeEvent({
                category: { _id: 'cat1', name: 'Boxeo', color: '#000', maxQuantityPerTicket: 2, description: 'interna', __v: 0 },
                organizer: fakeUser('organizer')
            });

            const dto = toEventDTO(event);

            expect(dto.category).to.deep.equal({ _id: 'cat1', name: 'Boxeo', color: '#000', maxQuantityPerTicket: 2 });
            expect(dto.organizer).to.have.keys(['_id', 'first_name', 'last_name']);
            expect(leaksPassword(dto)).to.equal(false);
        });

        it('deja las referencias sin poblar tal cual (ObjectId)', () => {
            const category = new mongoose.Types.ObjectId();
            const organizer = new mongoose.Types.ObjectId();

            const dto = toEventDTO(fakeEvent({ category, organizer }));

            expect(dto.category).to.equal(category);
            expect(dto.organizer).to.equal(organizer);
        });

        it('no expone campos internos como bookingVersion', () => {
            expect(toEventDTO(fakeEvent({ bookingVersion: 3 }))).to.not.have.property('bookingVersion');
        });
    });

    describe('Ticket', () => {
        const baseTicket = {
            _id: 't1',
            status: 'confirmed',
            quantity: 2,
            reservationCode: 'RES-ABC123',
            cancelledAt: null
        };

        it('con el usuario poblado no expone su password', () => {
            const user = fakeUser('user');
            const dto = toTicketDTO({ ...baseTicket, user, event: fakeEvent() });

            expect(dto.user).to.deep.equal({
                _id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email
            });
            expect(leaksPassword(dto)).to.equal(false);
        });

        it('con el evento poblado solo deja los datos públicos del evento', () => {
            const dto = toTicketDTO({ ...baseTicket, user: 'u1', event: fakeEvent({ organizer: fakeUser('organizer') }) });

            expect(dto.event).to.have.keys(['_id', 'title', 'date', 'endDate', 'location', 'status']);
            expect(dto.event).to.not.have.property('organizer');
        });

        it('deja las referencias sin poblar tal cual', () => {
            const user = new mongoose.Types.ObjectId();
            const event = new mongoose.Types.ObjectId();

            const dto = toTicketDTO({ ...baseTicket, user, event });

            expect(dto.user).to.equal(user);
            expect(dto.event).to.equal(event);
        });
    });

    describe('Categoría', () => {
        it('no expone campos internos', () => {
            const dto = toCategoryDTO({ _id: 'c1', name: 'Boxeo', color: '#000', maxQuantityPerTicket: null, __v: 0 });
            expect(dto).to.not.have.property('__v');
            expect(dto).to.include({ name: 'Boxeo' });
        });
    });
});
