import { toUserDTO } from '../dto/user.dto.js';

export class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }

    getUsers = async (req, res, next) => {
        try {
            const users = await this.usersService.getUsers();
            return res.status(200).json({ status: 'success', payload: users.map(toUserDTO) });
        } catch (error) {
            next(error);
        }
    }

    updateRole = async (req, res, next) => {
        try {
            const updated = await this.usersService.updateRole(req.params.uid, req.body?.role, req.user);
            return res.status(200).json({ status: 'success', payload: toUserDTO(updated) });
        } catch (error) {
            next(error);
        }
    }
}