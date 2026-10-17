import { expect } from 'chai';
import { UsersService } from '../../src/services/users.service.js';
import { fakeUser, fakeUserRepo, expectAppError } from './fakes.js';

describe('UsersService', () => {
    const admin = fakeUser('admin');

    describe('updateRole', () => {
        it('cambia el rol de otro usuario', async () => {
            const target = fakeUser('user');
            const service = new UsersService(fakeUserRepo({ updateRole: async (id, role) => ({ ...target, role }) }));

            const updated = await service.updateRole(target._id, 'organizer', admin);

            expect(updated.role).to.equal('organizer');
        });

        it('rol inexistente → 400', async () => {
            const service = new UsersService(fakeUserRepo());
            await expectAppError(service.updateRole('u1', 'superadmin', admin), 400);
        });

        it('no se puede cambiar el propio rol → 400', async () => {
            const service = new UsersService(fakeUserRepo());
            await expectAppError(service.updateRole(admin._id, 'user', admin), 400);
        });

        it('usuario inexistente → 404', async () => {
            const service = new UsersService(fakeUserRepo({ updateRole: async () => null }));
            await expectAppError(service.updateRole('u1', 'user', admin), 404);
        });
    });
});
