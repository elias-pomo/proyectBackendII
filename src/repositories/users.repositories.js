// src/repositories/UserRepository.js
export class UserRepository {
    constructor(dao) {
        this.dao = dao;
    }

    // Incluye password: usar solo para validar credenciales
    async findByEmail(email) {
        return await this.dao.findByEmail(email);
    }

    async findById(id) {
        return await this.dao.findById(id);
    }

    async findAll() {
        return await this.dao.findAll();
    }

    async create(userData) {
        return await this.dao.create(userData);
    }

    async updateRole(id, role) {
        return await this.dao.update(id, { role });
    }
}