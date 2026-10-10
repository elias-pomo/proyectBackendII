import 'dotenv/config'; // Carga las variables del .env antes de cualquier otra cosa
import app from './app.js';
import { connDB } from './config/database.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 8080;

const startServer = async () => {
    try {
        await connDB();
        app.listen(PORT, () => logger.info(`Servidor escuchando en el puerto ${PORT}`));
    } catch (error) {
        logger.error('Error al iniciar el servidor', error);
        process.exit(1);
    }
};

startServer();