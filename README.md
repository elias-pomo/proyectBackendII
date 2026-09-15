# Plataforma de Inscripciones - Pre-entrega 2

Implementación del flujo seguro de registro de usuarios con validación, normalización de correo, encriptación de contraseñas mediante bcrypt y persistencia en MongoDB, respetando la arquitectura en capas (ruta -> controller -> service -> repository/DAO -> modelo).

Instalación y ejecución:

1. Clonar el repositorio:
   git clone [<url-del-repositorio>](https://github.com/elias-pomo/proyectBackendII)

2. Instalar las dependencias:
   npm install

3. Configurar las variables de entorno:
   Crear un archivo .env en la raíz del proyecto tomando como referencia el archivo .env.example:
   PORT=
   MONGO_URL=mongodb+srv://<usuario>:<password>@cluster0.mongodb.net/backend2
   JWT_SECRET=tu_palabra_secreta_super_segura
   JWT_EXPIRES_IN=
   NODE_ENV=

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

2. Inicio de Sesión (Login)
   Método: POST

Ruta: /api/sessions/login

Descripción: Valida credenciales, genera un JWT y lo inyecta en una cookie HTTP Only llamada currentUser.
JSON
{
"email": "ana@mail.com",
"password": "Secreta123"
}
Respuestas:

200 OK (Login exitoso - Setea cookie currentUser)
401 Unauthorized (Credenciales inválidas - Mensaje genérico por seguridad)

3. Obtener Usuario Actual (Current)
   Método: GET

Ruta: /api/sessions/current

Descripción: Ruta protegida. El middleware lee la cookie, verifica el JWT y devuelve los datos del usuario autenticado.

Headers/Body: No requiere. Depende de la cookie currentUser.

Respuestas:

200 OK (Autenticado)
401 Unauthorized (Sin cookie o token expirado/inválido)

4. Cerrar Sesión (Logout)
   Método: POST

Ruta: /api/sessions/logout

Descripción: Elimina la cookie currentUser para cerrar la sesión del usuario.

Respuestas:

200 OK (Cookie eliminada)

Cómo probar el sistema:

Para verificar el flujo de autenticación, te recomiendo usar Postman y seguir este orden:

1. Registrar un usuario en /api/sessions/register.

2. Iniciar sesión en /api/sessions/login con esas credenciales. (Verificar en Postman que la pestaña "Cookies" ahora contiene currentUser).

3. Hacer una petición GET a /api/sessions/current para ver la información desencriptada del token.

4. Ejecutar el Logout en /api/sessions/logout (Verificar que la cookie desaparece).

5. Intentar acceder nuevamente a /api/sessions/current para confirmar que el sistema responde con un error 401 No autenticado.
