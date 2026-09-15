import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

export const generateToken = (user) => {
    // jwt.sign recibe: 1. Payload, 2. Clave secreta, 3. Opciones (como expiración)
    const token = jwt.sign(user, config.general.SECRET, { expiresIn: config.general.JWT_EXPIRES_IN });
    return token;
};