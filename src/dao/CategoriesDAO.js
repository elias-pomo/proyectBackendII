import { categoryModel } from './models/category.model.js';

export class CategoriesDAO {
    async get() {
        return await categoryModel.find().sort({ name: 1 }).lean();
    }
    async getById(id) {
        return await categoryModel.findById(id).lean();
    }
    async create(data) {
        const category = await categoryModel.create(data);
        return category.toJSON();
    }

    async getByName(name) {
    return await categoryModel.findOne({ name })
        .collation({ locale: 'es', strength: 2 })   // ignora mayúsculas: "boxeo" = "Boxeo"
        .lean();
}
}