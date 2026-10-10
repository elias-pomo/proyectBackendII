import { toCurrentUserDTO, toLoginUserDTO, toRegisteredUserDTO } from '../dto/user.dto.js';

const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
});

export class SessionsController {
    constructor(sessionsService) {
        this.sessionsService = sessionsService;
    }

    // req.user lo deja el middleware localAuth, ya registrado
    register = (req, res) => {
        return res.status(201).json({ status: 'success', payload: toRegisteredUserDTO(req.user) });
    }

    login = (req, res) => {
        const token = this.sessionsService.createToken(req.user);
        res.cookie('currentUser', token, cookieOptions());
        return res.status(200).json({
            status: 'success',
            message: 'Login exitoso',
            user: toLoginUserDTO(req.user)
        });
    }

    logout = (req, res) => {
        res.clearCookie('currentUser', cookieOptions());
        return res.status(200).json({ status: 'success', message: 'Logout exitoso' });
    }

    currentUser = (req, res) => {
        return res.status(200).json({ status: 'success', payload: toCurrentUserDTO(req.user) });
    }
}