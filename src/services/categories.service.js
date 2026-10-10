// src/services/categories.service.js
import { AppError } from '../utils/AppError.js';

const EDITABLE_FIELDS = ['description', 'color', 'maxQuantityPerTicket'];

export class CategoriesService {
    constructor(categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    async getCategories() {
        return await this.categoryRepository.findAll();
    }

    async createCategory(body) {
        const { name, description, color, maxQuantityPerTicket } = body ?? {};

        if (typeof name !== 'string' || !name.trim()) throw new AppError('El nombre es obligatorio', 400);
        if (await this.categoryRepository.findByName(name.trim())) {
            throw new AppError('Ya existe una categoría con ese nombre', 409);
        }

        return await this.categoryRepository.create({ name, description, color, maxQuantityPerTicket });
    }

    async updateCategory(id, body) {
        const data = {};
        for (const field of EDITABLE_FIELDS) {
            if (body?.[field] !== undefined) data[field] = body[field];   // maxQuantityPerTicket: null quita el límite
        }
        if (Object.keys(data).length === 0) throw new AppError('No hay campos válidos para actualizar', 400);

        const updated = await this.categoryRepository.update(id, data);
        if (!updated) throw new AppError('Categoría no encontrada', 404);
        return updated;
    }
}