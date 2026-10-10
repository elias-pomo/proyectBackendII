// src/services/users.service.js
import { AppError } from '../utils/AppError.js';
import { USER_ROLES } from '../constants/statuses.js';

export class UsersService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async getUsers() {
        return await this.userRepository.findAll();
    }

    async updateRole(uid, role, currentUser) {
        if (!USER_ROLES.includes(role)) {
            throw new AppError(`Rol inválido. Valores permitidos: ${USER_ROLES.join(', ')}`, 400);
        }
        if (String(uid) === String(currentUser._id)) {
            throw new AppError('No podés cambiar tu propio rol', 400);
        }

        const updated = await this.userRepository.updateRole(uid, role);
        if (!updated) throw new AppError('Usuario no encontrado', 404);
        return updated;
    }
}