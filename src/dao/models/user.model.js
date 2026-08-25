import mongoose, { Collection } from 'mongoose';

const userSchema = new.mongoose.Schema({
    name:{
        type:String,
        required: true,
        trim: true,
        minLength: [3, "el nombre debe tener un minimo de 3 caracteres"]
    },
    lastName:{
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
        trim: true
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

export const userModel = mongoose.model('user',userSchema);