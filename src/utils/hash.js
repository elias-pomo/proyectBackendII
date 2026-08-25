import bcrypt, { hash } from 'bcrypt'

export const createHash=password=>bcrypt.hashSync(password, 10)
export const validaHash=(password,hash)=>bcrypt.compareSync()
    //{
    //return
    //}