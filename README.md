# Proyecto Back-End II

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

🔒 Arquitectura y Autenticación Centralizada (Passport.js)
En esta versión, la API ha sido refactorizada para delegar el flujo de autenticación y autorización a Passport.js, mejorando la escalabilidad y limpieza de las rutas.

1. Estrategias Centralizadas: Toda la lógica de autenticación (validación, normalización, uso de bcrypt para el registro y validación de credenciales en el login) se encuentra encapsulada en src/config/passport.config.js.
2. Escalabilidad: El sistema está preparado y estructurado para integrar fácilmente futuros proveedores de autenticación externos (OAuth con Google, GitHub, etc.) sin necesidad de modificar el archivo principal de la aplicación (app.js).

Documentación del Endpoint:

- Método: POST
- Ruta: /api/sessions/register
- Headers: Content-Type: application/json

1. Registro de Usuario
   Método: POST
   Ruta: /api/sessions/register

Descripción: La ruta limpia delega la validación, normalización, encriptación con bcrypt y verificación de unicidad en MongoDB a la estrategia passport.authenticate('register'). Asigna automáticamente el rol por defecto.

Respuestas:
201 Created: Registro exitoso (devuelve el payload sin contraseña).
400 Bad Request: Campos faltantes o formato inválido.
409 Conflict: El email ya está registrado.

2. Inicio de Sesión (Login)
   Método: POST
   Ruta: /api/sessions/login

Descripción: Utiliza la estrategia de Passport para validar las credenciales. Tras una autenticación exitosa, el controller asume la responsabilidad de generar el JWT y configurar la cookie HTTP Only (currentUser).

Respuestas:
200 OK: Login exitoso (Setea cookie currentUser).
401 Unauthorized: Credenciales inválidas (Mensaje genérico por seguridad).

3. Obtener Usuario Actual (Current)
   Método: GET
   Ruta: /api/sessions/current

Descripción: Ruta protegida por la estrategia de Passport que extrae y valida el JWT directamente desde la cookie HTTP Only. Si es válido, inyecta los datos en req.user.

Respuestas:
200 OK: Autenticado. Devuelve { id, email, role } sin exponer datos sensibles.
401 Unauthorized: Sin cookie, token expirado o manipulado.

4. Cerrar Sesión (Logout)
   Método: POST
   Ruta: /api/sessions/logout

Descripción: Elimina la cookie currentUser para cerrar la sesión de forma segura. No requiere pasar por Passport.

Respuestas:
200 OK: Cookie eliminada exitosamente.

Cómo probar el sistema:

Para verificar el flujo de autenticación, te recomiendo usar Postman y seguir este orden:

1. Registrar un usuario en /api/sessions/register.

2. Iniciar sesión en /api/sessions/login con esas credenciales. (Verificar en Postman que la pestaña "Cookies" ahora contiene currentUser).

3. Hacer una petición GET a /api/sessions/current para ver la información desencriptada del token.

4. Ejecutar el Logout en /api/sessions/logout (Verificar que la cookie desaparece).

5. Intentar acceder nuevamente a /api/sessions/current para confirmar que el sistema responde con un error 401 No autenticado.
