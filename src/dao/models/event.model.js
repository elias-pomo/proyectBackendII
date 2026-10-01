// src/dao/models/event.model.js
import mongoose from "mongoose";

export const EVENT_STATUSES = ['draft', 'published', 'cancelled', 'finished'];

const EventsSchema = new mongoose.Schema(
    {
        code: { type: String, unique: true, required: true, trim: true },
        title: { type: String, required: [true, 'El título es obligatorio'], trim: true, minLength: [3, 'El título debe tener al menos 3 caracteres'] },
        description: { type: String, required: [true, 'La descripción es obligatoria'], trim: true, minLength: [10, 'La descripción debe tener al menos 10 caracteres'] },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'categories', required: [true, 'La categoría es obligatoria'] },
        date: { type: Date, required: [true, 'La fecha es obligatoria'] },
        endDate: {
            type: Date,
            required: [true, 'La fecha de fin es obligatoria'],
            validate: {
                validator: function (value) { return !this.date || value > this.date; },
                message: 'La clase debe terminar después de empezar'
            }
        },
        location: { type: String, required: [true, 'La ubicación es obligatoria'], trim: true },
        capacity: {
            type: Number,
            required: [true, 'El cupo es obligatorio'],
            min: [1, 'El cupo debe ser mayor a 0'],
            validate: { validator: Number.isInteger, message: 'El cupo debe ser un número entero' }
        },
        price: { type: Number, default: 0, min: [0, 'El precio no puede ser negativo'] },
        status: {
            type: String,
            enum: { values: EVENT_STATUSES, message: 'Estado inválido. Valores permitidos: draft, published, cancelled, finished' },
            default: 'draft'
        },
        organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true }
    },
    { timestamps: true }
);

export const eventModel = mongoose.model("events", EventsSchema);