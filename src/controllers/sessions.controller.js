import SessionsService from '../services/sessions.service.js';

const sessionsService = new SessionsService();

export default class SessionsController {
    register = async (req, res) => {
        try {
            const responsePayload = await sessionsService.register(req.body);
            res.status(201).json({
                status: "success",
                payload:{
                    name: responsePayload.first_name,
                    email: responsePayload.email,
                    role: responsePayload.role
                }
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: "error",
                message: error.message || "Error interno del servidor"
            });
        }
    }
    login = async (req, res) => {
        try {
            const responsePayload = await sessionsService.login(req.body.email, req.body.password);
            req.session.user = responsePayload;
            res.status(200).json({
                status:"success", 
                message:"Login exitoso", 
                payload:{
                    name: responsePayload.first_name,
                    email: responsePayload.email,
                    role: responsePayload.role
                }});
        } catch (error) {
            console.error(error);
            res.status(error.status || 500).json({
                status: "error",
                message: error.message || "Error interno del servidor"
            });
        }
    }

    logout = async (req, res) =>{
        try {
            const responsePayload = await sessionsService.logout(req, res);
            res.status(200).json({
                status:"success",
                message:"Logout exitoso",
                payload:{
                    name: responsePayload.first_name,
                    email: responsePayload.email,
                    role: responsePayload.role
                }
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: "error",
                message: error.message || "Error interno del servidor"
            });
        }
    }
}