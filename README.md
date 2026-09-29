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

# API de Eventos: Roles y autorización

API REST para gestionar eventos, con autenticación mediante JWT en cookie y autorización por roles (`user`, `organizer`, `admin`). Las rutas se protegen con middlewares reutilizables, y las respuestas diferencian correctamente **401** (sin sesión) de **403** (sin permisos).

## Roles

| Rol         | Descripción                                                                                |
| ----------- | ------------------------------------------------------------------------------------------ |
| `user`      | Rol por defecto. Puede iniciar sesión, consultar su sesión y ver el listado de eventos.    |
| `organizer` | Además de lo anterior, crea eventos y **solo puede modificar o eliminar los suyos**.       |
| `admin`     | Puede modificar o eliminar cualquier evento y gestionar usuarios (listar y cambiar roles). |

### Cómo se asigna un rol

- El registro público (`POST /api/sessions/register`) **siempre** crea un `user`. Cualquier campo `role` enviado en el body se ignora, por lo que no es posible crear `organizer` ni `admin` desde ahí.
- Un `admin` cambia el rol de otro usuario con `PATCH /api/users/:uid/role`.

## Matriz de permisos

| Acción                                    | Sin sesión | user   | organizer | admin |
| ----------------------------------------- | ---------- | ------ | --------- | ----- |
| Registrarse / iniciar sesión              | ✅         | ✅     | ✅        | ✅    |
| Listar eventos                            | ✅         | ✅     | ✅        | ✅    |
| Ver sesión actual                         | ❌ 401     | ✅     | ✅        | ✅    |
| Cerrar sesión                             | ❌ 401     | ✅     | ✅        | ✅    |
| Crear evento                              | ❌ 401     | ❌ 403 | ✅        | ✅    |
| Modificar / eliminar un evento **propio** | ❌ 401     | ❌ 403 | ✅        | ✅    |
| Modificar / eliminar un evento **ajeno**  | ❌ 401     | ❌ 403 | ❌ 403    | ✅    |
| Listar usuarios                           | ❌ 401     | ❌ 403 | ❌ 403    | ✅    |
| Cambiar el rol de un usuario              | ❌ 401     | ❌ 403 | ❌ 403    | ✅    |

### Públicas

| Método | Ruta                     | Descripción                                      |
| ------ | ------------------------ | ------------------------------------------------ |
| POST   | `/api/sessions/register` | Registro (siempre con rol `user`)                |
| POST   | `/api/sessions/login`    | Inicio de sesión (setea la cookie `currentUser`) |
| GET    | `/api/events`            | Listado de eventos                               |

### Protegidas

| Método | Ruta                    | Acceso                                  | Respuestas              |
| ------ | ----------------------- | --------------------------------------- | ----------------------- |
| GET    | `/api/sessions/current` | Cualquier usuario autenticado           | 200, 401                |
| POST   | `/api/sessions/logout`  | Cualquier usuario autenticado           | 200, 401                |
| POST   | `/api/events`           | `organizer`, `admin`                    | 201, 400, 401, 403, 409 |
| PUT    | `/api/events/:id`       | `organizer` (solo sus eventos), `admin` | 200, 400, 401, 403, 404 |
| DELETE | `/api/events/:id`       | `organizer` (solo sus eventos), `admin` | 200, 400, 401, 403, 404 |
| GET    | `/api/users`            | `admin`                                 | 200, 401, 403           |
| PATCH  | `/api/users/:uid/role`  | `admin`                                 | 200, 400, 401, 403, 404 |

## Middlewares

Están separados de las rutas y son reutilizables (`src/middlewares/`):

| Archivo             | Qué hace                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth..js`          | Lee el JWT de la cookie `currentUser`, lo valida con Passport, carga el usuario desde la base en `req.user` y responde **401** si no hay sesión válida. |
| `authorize.js`      | Recibe los roles permitidos como parámetro, los compara con `req.user.role` y responde **403** si no coincide.                                          |
| `authEventOwner.js` | Verifica que el usuario sea `admin` o el `organizer` dueño del evento; responde **404** si el evento no existe y **403** si no es el dueño.             |

## Casos de prueba

| Caso                                          | Resultado esperado |
| --------------------------------------------- | ------------------ |
| Cualquier ruta privada sin cookie             | 401                |
| `POST /api/events` con rol `user`             | 403                |
| `POST /api/events` con rol `organizer`        | 201                |
| `GET /api/users` con rol `organizer`          | 403                |
| `GET /api/users` con rol `admin`              | 200                |
| `organizer` modificando un evento ajeno       | 403                |
| `organizer` modificando un evento propio      | 200                |
| `admin` modificando el evento de un organizer | 200                |

## Evidencia

Las capturas están en `evidencia`.
