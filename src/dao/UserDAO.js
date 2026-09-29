import { userModel} from './models/user.model.js'

export default class UserDao {
    async findByEmail(email) {
        return await userModel.findOne({ email });
    }

    async save(userData) {
        return await userModel.create(userData);
    }

async getAll() {
    return await userModel.find().select('-password').lean();
}
async updateRole(id, role) {
    return await userModel.findByIdAndUpdate(id, { role }, { new: true, runValidators: true })
        .select('-password').lean();
}

}