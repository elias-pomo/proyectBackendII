import UsersRepository from '../repositories/users.repositories.js';
import UserDAO from '../dao/UserDAO.js';
import { createHash, validaHash } from '../utils/hash.js';

const userDAO = new UserDAO();
const usersRepository = new UsersRepository(userDAO);

export default class SessionsService {
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