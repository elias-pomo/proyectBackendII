import { userModel } from '../models/user.model.js';

export class UserDAO {
    // Único método que devuelve password: solo para validar credenciales en el login
    async findByEmail(email) {
        return await userModel.findOne({ email }).lean();
    }

    async findById(id) {
        return await userModel.findById(id).select('-password').lean();
    }

    async findAll() {
        return await userModel.find().select('-password').lean();
    }

    async create(data) {
        const user = await userModel.create(data);
        return user.toObject();
    }

    async update(id, data) {
        return await userModel.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true })
            .select('-password')
            .lean();
    }

    async count(filter = {}) {
        return await userModel.countDocuments(filter);
    }
}