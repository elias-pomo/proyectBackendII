import { Router } from 'express';
import { CategoriesController } from '../controllers/categories.controller.js';
import { categoriesService } from '../container.js';
import { auth } from '../middlewares/auth.js';
import { authorizeRoles } from '../middlewares/authorize.js';

const router = Router();
const categoriesController = new CategoriesController(categoriesService);

router.use(auth);
router.get('/', categoriesController.getCategories);
router.post('/', authorizeRoles('admin'), categoriesController.createCategory);
router.patch('/:id', authorizeRoles('admin'), categoriesController.updateCategory);

export default router;