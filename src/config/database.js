import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export const connDB = async (
    mongoUri = process.env.MONGO_URL,
    dbName = process.env.DB_NAME
) => {
    await mongoose.connect(mongoUri, { dbName });
    logger.info(`DB ${dbName} online`);
};