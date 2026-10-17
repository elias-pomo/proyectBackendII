import { expect } from 'chai';
import { SessionsService } from '../../src/services/sessions.service.js';
import { createHash, validaHash } from '../../src/utils/hash.js';
import { fakeUser, fakeUserRepo, expectAppError } from './fakes.js';

const validBody = () => ({
    first_name: 'Elias',
    last_name: 'Coder',
    email: '  Elias@Mail.COM ',
    password: 'Password123!'
});

describe('SessionsService', () => {
    describe('register', () => {
        it('crea el usuario con rol user, email normalizado y password hasheada', async () => {
            const service = new SessionsService(fakeUserRepo());

            const created = await service.register({ ...validBody(), role: 'admin' });

            expect(created.role).to.equal('user');   // el role del body se ignora
            expect(created.email).to.equal('elias@mail.com');
            expect(created.password).to.not.equal('Password123!');
            expect(validaHash('Password123!', created.password)).to.equal(true);
        });

        it('campos faltantes → 400', async () => {
            const service = new SessionsService(fakeUserRepo());
            await expectAppError(service.register({ email: 'a@a.com' }), 400);
            await expectAppError(service.register(), 400);
        });

        it('password corta → 400', async () => {
            const service = new SessionsService(fakeUserRepo());
            await expectAppError(service.register({ ...validBody(), password: '123' }), 400);
        });

        it('email ya registrado → 409', async () => {
            const service = new SessionsService(fakeUserRepo({ findByEmail: async () => fakeUser() }));
            await expectAppError(service.register(validBody()), 409);
        });
    });

    describe('validateCredentials', () => {
        const stored = fakeUser('user', { email: 'elias@mail.com', password: createHash('Password123!') });
        const service = new SessionsService(fakeUserRepo({
            findByEmail: async (email) => (email === stored.email ? stored : null)
        }));

        it('devuelve el usuario con credenciales correctas', async () => {
            const user = await service.validateCredentials('ELIAS@mail.com', 'Password123!');
            expect(user._id).to.equal(stored._id);
        });

        it('password incorrecta o email inexistente → 401', async () => {
            await expectAppError(service.validateCredentials('elias@mail.com', 'incorrecta'), 401);
            await expectAppError(service.validateCredentials('nadie@mail.com', 'Password123!'), 401);
        });

        it('campos faltantes → 400', async () => {
            await expectAppError(service.validateCredentials('', 'Password123!'), 400);
        });
    });

    describe('createToken', () => {
        it('genera un JWT que no incluye la password', () => {
            const service = new SessionsService(fakeUserRepo());
            const token = service.createToken(fakeUser());

            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

            expect(payload).to.include.keys(['_id', 'email', 'role']);
            expect(payload).to.not.have.property('password');
        });
    });
});
