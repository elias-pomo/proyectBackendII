
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true, trim: true, minLength: [3, 'El nombre debe tener al menos 3 caracteres'] },
        description: { type: String, trim: true },
        color: { type: String, default: '#dc2626' },
        maxQuantityPerTicket: {
            type: Number,
            default: null,   // null = sin límite (solo rige el cupo del evento)
            min: [1, 'El límite debe ser mayor a 0'],
            validate: {
                validator: (value) => value === null || Number.isInteger(value),
                message: 'El límite debe ser un número entero'
            }
},   // color de la disciplina en el calendario
    },
    { timestamps: true },
);

export const categoryModel = mongoose.model('categories', categorySchema);