import UsersRepository from '../repositories/users.repositories.js';
import UserDAO from '../dao/UserDAO.js';
import { createHash, validaHash } from '../utils/hash.js';

const userDAO = new UserDAO();
const usersRepository = new UsersRepository(userDAO);

export default class SessionsService {
    async register(userData) {
        const { first_name, last_name, email, password } = userData;

        if (!first_name || !last_name || !email || !password) {
            throw { status: 400, message: "Faltan campos obligatorios" };
        }

        const normalizedEmail = email.trim().toLowerCase();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            throw { status: 400, message: "Formato de email inválido" };
        }

        if (password.length < 6) {
            throw { status: 400, message: "La contraseña debe tener al menos 6 caracteres" };
        }

        
        const existingUser = await usersRepository.getUserByEmail(normalizedEmail);
        if (existingUser) {
            throw { status: 409, message: "El email ya está registrado" };
        }

        const hashedPassword = createHash(password);

        const newUser = {
            first_name,
            last_name,
            email: normalizedEmail,
            password: hashedPassword,
            role: 'user'
        };

        const result = await usersRepository.createUser(newUser);

        return {
            id: result._id,
            first_name: result.first_name,
            last_name: result.last_name,
            email: result.email,
            role: result.role
        };
    }

    async login(email, password) {
        if (!email || !password) {
            throw { status: 400, message: "Faltan campos obligatorios" };
        }

        const user = await usersRepository.getUserByEmail(email);
        if (!user) {
            throw { status: 401, message: "Credenciales inválidas" };
        }

        if (!validaHash(password, user.password)) {
            throw { status: 401, message: "Credenciales inválidas" };
        }

        return {
            id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role
        };
    }

    async logout(req, res) {
        return new Promise((resolve, reject) => {
            req.session.destroy(error => {
                if (error) {
                    reject({ status: 500, message: "Fallo en el proceso de logout" });
                } else {
                    resolve("Logout exitoso");
                }
            });
        });
    }
}