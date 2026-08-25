import { userModel} from './models/user.model.js'

export class UserDAO{
    async getBy(filtro={}){
        return await userModel.findOne(filtro).lean();
    }

    async create(user={}){
        let newUser = await userModel.create(user);
        return newUser.toJSON() //deshidrata el docu de mongoose igual que .lean()
    }
}