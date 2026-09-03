import { userModel} from './models/user.model.js'

export default class UserDao {
    async findByEmail(email) {
        return await userModel.findOne({ email });
    }

    async save(userData) {
        return await userModel.create(userData);
    }
}