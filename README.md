# Plataforma de Inscripciones - Pre-entrega 2

Implementación del flujo seguro de registro de usuarios con validación, normalización de correo, encriptación de contraseñas mediante bcrypt y persistencia en MongoDB, respetando la arquitectura en capas (ruta -> controller -> service -> repository/DAO -> modelo).

Instalación y ejecución:

1. Clonar el repositorio:
   git clone [<url-del-repositorio>](https://github.com/elias-pomo/proyectBackendII)

2. Instalar las dependencias:
   npm install

3. Configurar las variables de entorno:
   Crear un archivo .env en la raíz del proyecto tomando como referencia el archivo .env.example:
   PORT=8080
   MONGO_URL=mongodb://127.0.0.1:27017/backend2

4. Iniciar el servidor en modo desarrollo:
   npm run dev

Documentación del Endpoint:

- Método: POST
- Ruta: /api/sessions/register
- Headers: Content-Type: application/json

Campos esperados en el Body (JSON):

- first_name (String, obligatorio): Nombre del usuario.
- last_name (String, obligatorio): Apellido del usuario.
- email (String, obligatorio): Correo electrónico.
- password (String, obligatorio): Contraseña de acceso (longitud mínima de 6 caracteres).

Ejemplo de Request:
{
"first_name": "Ana",
"last_name": "Pérez",
"email": "Ana@Mail.com",
"password": "Secreta123"
}

Respuestas del Servidor:

- 201 Created (Registro exitoso):
  Devuelve el objeto creado sin exponer la contraseña (ni en texto plano ni hasheada).
  {
  "status": "success",
  "payload": {
  "id": "665f2a...",
  "first_name": "Ana",
  "last_name": "Pérez",
  "email": "ana@mail.com",
  "role": "user"
  }
  }

- 400 Bad Request (Campos faltantes o formato inválido):
  {
  "status": "error",
  "message": "Faltan campos obligatorios"
  }

- 409 Conflict (Usuario duplicado):
  {
  "status": "error",
  "message": "El email ya está registrado"
  }

Cómo probar el sistema:

1. Abrir Postman o Thunder Client.
2. Configurar una petición POST apuntando a http://localhost:8080/api/sessions/register.
3. Verificar en MongoDB Compass que el documento se encuentre almacenado en la base de datos proyecto_cursada, dentro de la colección users, y comprobar que el campo password esté correctamente hasheado con bcrypt (comenzando con $2b$...).
