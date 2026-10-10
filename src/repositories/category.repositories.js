export class CategoryRepository {
    constructor(dao) {
        this.dao = dao;
    }

    async findAll() {
        return await this.dao.findAll();
    }

    async findById(id) {
        return await this.dao.findById(id);
    }

    async findByName(name) {
        return await this.dao.findByName(name);
    }

    async create(data) {
        return await this.dao.create(data);
    }

    async update(id, data) {
        return await this.dao.update(id, data);
    }
}