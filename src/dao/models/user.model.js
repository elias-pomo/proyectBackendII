import mongoose from 'mongoose';

const userCollection = 'users';

const userSchema = new mongoose.Schema({
    first_name:{
        type:String,
        required: true,
        trim: true,
        minLength: [3, "el nombre debe tener un minimo de 3 caracteres"]
    },
    last_name:{
        type: String,
        required: true,
        trim: true,
        minLength: [3, "el apellido debe tener un minimo de 3 caracteres"]
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required:true,
        trim: true,
        minLength: [6, "la contraseña debe tener un minimo de 6 caracteres"]
    },
    role:{
        type: String,
        enum: ["admin", "organizer", "user"],
        default: "user"
    },
},
{
    timestamps: true
});

export const userModel = mongoose.model(userCollection, userSchema);