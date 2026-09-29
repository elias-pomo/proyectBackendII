// src/controllers/users.controller.js
const VALID_ROLES = ['user', 'organizer', 'admin'];

export class UsersController {
    constructor(userDAO) {
        this.userDAO = userDAO;
    }

    getUsers = async (req, res, next) => {
        try {
            const users = await this.userDAO.getAll();
            return res.status(200).json({ status: 'success', payload: users });
        } catch (error) {
            next(error);
        }
    }

    updateRole = async (req, res, next) => {
        try {
            const { uid } = req.params;
            const { role } = req.body;

            if (!VALID_ROLES.includes(role)) {
                return res.status(400).json({
                    status: 'error',
                    message: `Rol inválido. Valores permitidos: ${VALID_ROLES.join(', ')}`
                });
            }
            if (uid === req.user._id.toString()) {
                return res.status(400).json({
                    status: 'error',
                    message: 'No podés cambiar tu propio rol'
                });
            }

            const updated = await this.userDAO.updateRole(uid, role);
            if (!updated) {
                return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
            }
            return res.status(200).json({ status: 'success', payload: updated });
        } catch (error) {
            next(error);
        }
    }
}