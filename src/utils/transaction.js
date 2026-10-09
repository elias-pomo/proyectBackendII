import mongoose from 'mongoose';

let warned = false;

const isTransactionUnsupported = (error) =>
    /Transaction numbers are only allowed on a replica set member or mongos/i.test(error?.message ?? '');

// Ejecuta work(session) dentro de una transacción. Mongoose la reintenta solo ante errores transitorios
// (por ejemplo, un conflicto de escritura entre dos reservas simultáneas), por eso `work` no debe
// tener efectos externos (nada de emails adentro).
export const runInTransaction = async (work) => {
    try {
        return await mongoose.connection.transaction((session) => work(session));
    } catch (error) {
        if (!isTransactionUnsupported(error)) throw error;

        if (!warned) {
            warned = true;
            console.warn('MongoDB sin replica set: no hay transacciones. Se ejecuta sin ellas y los cupos no quedan protegidos ante pedidos simultáneos.');
        }
        return await work(undefined);
    }
};