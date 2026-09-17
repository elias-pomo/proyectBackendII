import { config } from '../config/config.js';
import SessionsService from '../services/sessions.service.js';
import jwt from 'jsonwebtoken';
import { generateToken } from '../utils/jwt.js';

const sessionsService = new SessionsService();

export default class SessionsController {
    register = async (req, res) => {
        try {
            const responsePayload = await sessionsService.register(req.body);
            res.status(201).json({
                status: "success",
                payload:{
                    name: req.user.first_name,
                    email: req.user.email,
                    role: req.user.role
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
            const user = responsePayload;

            let token = generateToken(user);

            res.cookie("currentUser", token, {httpOnly: true})
            res.setHeader('Content-Type','application/json')

            res.status(200).json({
                status:"success", 
                message:"Login exitoso", 
                payload:{
                    name: req.user.first_name,
                    email: req.user.email,
                    role: req.user.role
                }, token});
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
            res.clearCookie('currentUser',{ httpOnly: true });
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

    currentUser = async (req, res) => {
    res.status(200).json({
        status: 'success',
        payload:{
            id: req.user._id,
            first_name: req.user.first_name,
            last_name: req.user.last_name,
            email: req.user.email,
            role: req.user.role
            }
        }
    )  
}

}