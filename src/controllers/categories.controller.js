import { toCategoryDTO } from '../dto/category.dto.js';

export class CategoriesController {
    constructor(categoriesService) {
        this.categoriesService = categoriesService;
    }

    getCategories = async (req, res, next) => {
        try {
            const categories = await this.categoriesService.getCategories();
            return res.status(200).json({ status: 'success', payload: categories.map(toCategoryDTO) });
        } catch (error) {
            next(error);
        }
    }

    createCategory = async (req, res, next) => {
        try {
            const created = await this.categoriesService.createCategory(req.body);
            return res.status(201).json({ status: 'success', payload: toCategoryDTO(created) });
        } catch (error) {
            next(error);
        }
    }

    updateCategory = async (req, res, next) => {
        try {
            const updated = await this.categoriesService.updateCategory(req.params.id, req.body);
            return res.status(200).json({ status: 'success', payload: toCategoryDTO(updated) });
        } catch (error) {
            next(error);
        }
    }
}