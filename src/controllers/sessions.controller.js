import SessionsService from '../services/sessions.service.js';

const sessionsService = new SessionsService();

export default class SessionsController {
    register = async (req, res) => {
        try {
            const responsePayload = await sessionsService.register(req.body);
            res.status(201).json({
                status: "success",
                payload: responsePayload
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: "error",
                message: error.message || "Error interno del servidor"
            });
        }
    }
}