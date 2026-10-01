import { Router } from 'express';
import { CategoriesController } from '../controllers/categories.controller.js';
import { CategoriesDAO } from '../dao/CategoriesDAO.js';
import { auth } from '../middlewares/auth.js';
import { authorizeRoles } from '../middlewares/authorize.js';

const router = Router();
const categoriesController = new CategoriesController(new CategoriesDAO());

router.use(auth);
router.get('/', categoriesController.getCategories);
router.post('/', authorizeRoles('admin'), categoriesController.createCategory);

export default router;