// src/dao/CategoriesDAO.js
import { categoryModel } from '../models/category.model.js';

export class CategoriesDAO {
    async findAll() {
        return await categoryModel.find().sort({ name: 1 }).lean();
    }

    async findById(id) {
        return await categoryModel.findById(id).lean();
    }

    async findByName(name) {
        return await categoryModel.findOne({ name })
            .collation({ locale: 'es', strength: 2 })   // ignora mayúsculas: "boxeo" = "Boxeo"
            .lean();
    }

    async create(data) {
        const category = await categoryModel.create(data);
        return category.toJSON();
    }

    async update(id, data) {
        return await categoryModel.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true }).lean();
    }
}