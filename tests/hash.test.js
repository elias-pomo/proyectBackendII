import { expect } from 'chai';
import { createHash, validaHash } from '../src/utils/hash.js';

describe('Pruebas de hash con bcrypt', () => {
it('debe hashear la contraseña y no ser igual al texto plano', () => {
    const password = 'miPassword123';
    const hash = createHash(password);
    
    expect(hash).to.not.equal(password);
    expect(validaHash(password, hash)).to.be.true;
});
});
