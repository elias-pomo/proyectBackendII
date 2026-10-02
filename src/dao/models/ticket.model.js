import mongoose from 'mongoose';

export const TICKET_STATUSES = ['confirmed', 'pending', 'cancelled'];
export const ACTIVE_TICKET_STATUSES = ['confirmed', 'pending'];   // los únicos que ocupan cupo

const ticketSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
        event: { type: mongoose.Schema.Types.ObjectId, ref: 'events', required: true },
        status: {
            type: String,
            enum: { values: TICKET_STATUSES, message: 'Estado inválido. Valores permitidos: confirmed, pending, cancelled' },
            default: 'confirmed'
        },
        quantity: {
            type: Number,
            required: true,
            default: 1,
            min: [1, 'La cantidad debe ser mayor a 0'],
            validate: { validator: Number.isInteger, message: 'La cantidad debe ser un número entero' }
        },
        reservationCode: { type: String, required: true, unique: true, trim: true },
        cancelledAt: { type: Date, default: null }
    },
    { timestamps: true }   // aporta createdAt y updatedAt
);

ticketSchema.index({ event: 1, status: 1 });       // cálculo de cupos
ticketSchema.index({ user: 1, createdAt: -1 });    // mis tickets

export const ticketModel = mongoose.model('tickets', ticketSchema);