// src/services/sessions.service.js
import { AppError } from '../utils/AppError.js';
import { createHash, validaHash } from '../utils/hash.js';
import { generateToken } from '../utils/jwt.js';

const MIN_PASSWORD_LENGTH = 6;
const isFilledString = (value) => typeof value === 'string' && value.trim() !== '';
const normalizeEmail = (email) => email.toLowerCase().trim();

export class SessionsService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    // El rol siempre es 'user': cualquier role enviado en el body se ignora
    async register({ first_name, last_name, email, password } = {}) {
        if (![first_name, last_name, email, password].every(isFilledString)) {
            throw new AppError('Todos los campos son obligatorios', 400);
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            throw new AppError(`La contraseña debe tener un mínimo de ${MIN_PASSWORD_LENGTH} caracteres`, 400);
        }

        const normalizedEmail = normalizeEmail(email);
        if (await this.userRepository.findByEmail(normalizedEmail)) {
            throw new AppError('El email ya está registrado', 409);
        }

        return await this.userRepository.create({
            first_name,
            last_name,
            email: normalizedEmail,
            password: createHash(password),
            role: 'user'
        });
    }

    async validateCredentials(email, password) {
        if (!isFilledString(email) || !isFilledString(password)) {
            throw new AppError('Faltan campos obligatorios', 400);
        }

        const user = await this.userRepository.findByEmail(normalizeEmail(email));
        if (!user || !validaHash(password, user.password)) {
            throw new AppError('Credenciales invalidas', 401);   // mensaje genérico: no revela si el email existe
        }
        return user;
    }

    // Usuario sin password, para la estrategia JWT
    async getUserById(id) {
        return await this.userRepository.findById(id);
    }

    createToken(user) {
        return generateToken({ _id: user._id, name: user.first_name, email: user.email, role: user.role });
    }
}