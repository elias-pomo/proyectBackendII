import 'dotenv/config'; // Carga las variables del .env antes de cualquier otra cosa
import app from './app.js';
import { connDB } from './config/database.js';

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await connDB();
    app.listen(PORT, () => {
      console.log(`Servidor escuchando en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
  }
};

startServer();
