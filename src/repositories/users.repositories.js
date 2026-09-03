export default class UsersRepository {
    constructor(dao) {
        this.dao = dao;
    }

    async getUserByEmail(email) {
        return await this.dao.findByEmail(email);
    }

    async createUser(userData) {
        return await this.dao.save(userData);
    }
}