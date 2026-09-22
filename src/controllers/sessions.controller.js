import { config } from '../config/config.js';
import jwt from 'jsonwebtoken';
import { generateToken } from '../utils/jwt.js';



export default class SessionsController {
    register = async (req, res) => {
        try {
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
            const user = {
                id: req.user._id,
                name: req.user.first_name,
                email: req.user.email,
                role: req.user.role 
            }

            let token = generateToken(user);

            res.cookie("currentUser", token, {httpOnly: true})
            res.setHeader('Content-Type','application/json')

            res.status(200).json({
                status:"success", 
                message:"Login exitoso", 
                user});
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
            res.clearCookie('currentUser',{ httpOnly: true });
            res.status(200).json({
                status:"success",
                message:"Logout exitoso",
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
            email: req.user.email,
            role: req.user.role
            }
        }
    )  
}

}