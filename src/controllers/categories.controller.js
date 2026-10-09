export class CategoriesController {
    constructor(categoriesDAO) {
        this.categoriesDAO = categoriesDAO;
    }

    getCategories = async (req, res, next) => {
        try {
            const categories = await this.categoriesDAO.get();
            return res.status(200).json({ status: 'success', payload: categories });
        } catch (error) {
            next(error);
        }
    }
updateCategory = async (req, res, next) => {
    try {
        const { description, color, maxQuantityPerTicket } = req.body ?? {};
        const data = {};
        if (description !== undefined) data.description = description;
        if (color !== undefined) data.color = color;
        if (maxQuantityPerTicket !== undefined) data.maxQuantityPerTicket = maxQuantityPerTicket;   // null quita el límite

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ status: 'error', message: 'No hay campos válidos para actualizar' });
        }

        const updated = await this.categoriesDAO.update(req.params.id, data);
        if (!updated) {
            return res.status(404).json({ status: 'error', message: 'Categoría no encontrada' });
        }
        return res.status(200).json({ status: 'success', payload: updated });
    } catch (error) {
        next(error);
    }
}
    createCategory = async (req, res, next) => {
        const { name, description, color, maxQuantityPerTicket } = req.body;
const created = await this.categoriesDAO.create({ name, description, color, maxQuantityPerTicket });


        try {
            const { name, description, color } = req.body;
            const created = await this.categoriesDAO.create({ name, description, color });
            return res.status(201).json({ status: 'success', payload: created });
        } catch (error) {
            next(error);
        }
    }
}