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

    createCategory = async (req, res, next) => {
        try {
            const { name, description, color } = req.body;
            const created = await this.categoriesDAO.create({ name, description, color });
            return res.status(201).json({ status: 'success', payload: created });
        } catch (error) {
            next(error);
        }
    }
}