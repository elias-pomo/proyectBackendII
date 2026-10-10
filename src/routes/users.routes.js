// src/routes/users.routes.js
import { Router } from 'express';
import { UsersController } from '../controllers/users.controller.js';
import { usersService } from '../container.js';
import { auth } from '../middlewares/auth.js';
import { authorizeRoles } from '../middlewares/authorize.js';

const router = Router();
const usersController = new UsersController(usersService);

router.use(auth, authorizeRoles('admin'));   // todo lo de /api/users es solo admin

router.get('/', usersController.getUsers);
router.patch('/:uid/role', usersController.updateRole);

export default router;