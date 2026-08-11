import dotenv from 'dotenv';
import app from './app.js';

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto: ${PORT}`)
});