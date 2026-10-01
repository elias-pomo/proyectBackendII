
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true, trim: true, minLength: [3, 'El nombre debe tener al menos 3 caracteres'] },
        description: { type: String, trim: true },
        color: { type: String, default: '#dc2626' }   // color de la disciplina en el calendario
    },
    { timestamps: true }
);

export const categoryModel = mongoose.model('categories', categorySchema);