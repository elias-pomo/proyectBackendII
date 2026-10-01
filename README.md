# Proyecto Back-End II: API de clases de gimnasio

API REST para gestionar las clases (eventos) de un gimnasio ficticio orientado a deportes de contacto (boxeo, karate, taekwondo, musculación). Incluye autenticación con JWT en cookie, autorización por roles (`user`, `organizer`, `admin`) y un CRUD de eventos con reglas de negocio, filtros, paginación y ordenamiento.

## Stack

Node.js (ES modules), Express 5, MongoDB con Mongoose, Passport (estrategias local y JWT), jsonwebtoken, cookie-parser, bcrypt y Handlebars.

## Instalación y ejecución

```bash
git clone https://github.com/elias-pomo/proyectBackendII.git
cd proyectBackendII
npm install
cp .env.example .env     # completar los valores (el archivo .env es obligatorio para arrancar)
npm run dev              # desarrollo (nodemon)
npm start                # producción
```

### Variables de entorno

| Variable         | Descripción                                                              |
| ---------------- | ------------------------------------------------------------------------ |
| `PORT`           | Puerto del servidor                                                      |
| `NODE_ENV`       | `development` o `production` (en producción la cookie se marca `secure`) |
| `SECRET`         | Secreto para firmar los JWT                                              |
| `JWT_EXPIRES_IN` | Duración del token (por ejemplo `1h`)                                    |
| `MONGO_URL`      | URL de conexión a MongoDB                                                |
| `DB_NAME`        | Nombre de la base de datos                                               |

## Arquitectura

Cada capa tiene una única responsabilidad:

| Capa          | Responsabilidad                                                               |
| ------------- | ----------------------------------------------------------------------------- |
| `routes`      | Define las rutas y encadena los middlewares de acceso                         |
| `controllers` | Solo manejan request y response; no contienen lógica de negocio               |
| `services`    | Reglas de negocio y validaciones (fechas, estados, permisos sobre el recurso) |
| `dao`         | Acceso a datos (consultas a MongoDB)                                          |
| `models`      | Esquemas de Mongoose                                                          |

```
src/
├── config/                    # config.js, passport.config.js
├── strategies/                # jwt.strategy.js, login.strategy.js, register.strategy.js
├── controllers/               # events, categories, sessions, users
├── services/
│   └── events.service.js      # reglas de negocio de eventos
├── dao/
│   ├── EventsDAO.js
│   ├── CategoriesDAO.js
│   ├── UserDAO.js
│   └── models/                # event, category, user
├── middlewares/
│   ├── auth.js                # sesión obligatoria (401)
│   ├── optionalAuth.js        # sesión opcional (visitante o usuario)
│   ├── authorize.js           # authorizeRoles(...roles) (403)
│   └── errorHandler.js        # traduce errores a respuestas HTTP
├── routes/                    # events, categories, sessions, users
└── utils/AppError.js          # error con código HTTP
```

## Autenticación

- El login genera un JWT que se guarda en la cookie `currentUser` (`httpOnly`, `sameSite: strict` y `secure` en producción).
- `auth.js` valida el token con la estrategia `current` de Passport, carga el usuario desde la base en `req.user` y responde **401** si no hay una sesión válida. Como lee el usuario en cada request, un cambio de rol rige de inmediato, sin volver a iniciar sesión.
- `optionalAuth.js` hace lo mismo pero no corta la request: si no hay sesión, continúa como visitante. Se usa en las rutas de lectura públicas.
- `authorize.js` exporta `authorizeRoles(...roles)`, que compara `req.user.role` con los roles permitidos y responde **403** si no coincide.

## Roles

| Rol         | Descripción                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `user`      | Rol por defecto al registrarse. Puede consultar eventos y su sesión.                              |
| `organizer` | Además crea eventos y **solo puede modificar los suyos** (editarlos y cambiar su estado).         |
| `admin`     | Puede modificar cualquier evento, crear categorías y gestionar usuarios (listar y cambiar roles). |

### Cómo se asigna un rol

- El registro público (`POST /api/sessions/register`) **siempre** crea un `user`. Cualquier `role` enviado en el body se ignora, por lo que no se puede crear un `organizer` ni un `admin` desde ahí.
- Un `admin` cambia el rol de otro usuario con `PATCH /api/users/:uid/role`. No puede cambiar el suyo propio, para no quedarse sin administradores.
- El primer `admin` se asigna directamente en la base de datos: registrar el usuario por la API y cambiar su campo `role` a `admin` (por ejemplo desde MongoDB Atlas, en _Browse Collections_, o con `db.users.updateOne({ email: "..." }, { $set: { role: "admin" } })` en mongosh). Desde ahí, ese admin promueve a los demás.

## Matriz de permisos

| Acción                                          | Visitante | user   | organizer           | admin    |
| ----------------------------------------------- | --------- | ------ | ------------------- | -------- |
| Registrarse / iniciar sesión                    | ✅        | ✅     | ✅                  | ✅       |
| Ver sesión actual / cerrar sesión               | ❌ 401    | ✅     | ✅                  | ✅       |
| Listar eventos y ver un evento (no borradores)  | ✅        | ✅     | ✅                  | ✅       |
| Ver borradores (`draft`)                        | ❌        | ❌     | ✅ solo los propios | ✅ todos |
| Crear evento                                    | ❌ 401    | ❌ 403 | ✅                  | ✅       |
| Editar / cambiar estado de un evento **propio** | ❌ 401    | ❌ 403 | ✅                  | ✅       |
| Editar / cambiar estado de un evento **ajeno**  | ❌ 401    | ❌ 403 | ❌ 403              | ✅       |
| Listar categorías                               | ❌ 401    | ✅     | ✅                  | ✅       |
| Crear categoría                                 | ❌ 401    | ❌ 403 | ❌ 403              | ✅       |
| Listar usuarios / cambiar el rol de un usuario  | ❌ 401    | ❌ 403 | ❌ 403              | ✅       |

## Rutas

### Públicas

| Método | Ruta                     | Descripción                                      |
| ------ | ------------------------ | ------------------------------------------------ |
| POST   | `/api/sessions/register` | Registro (siempre con rol `user`)                |
| POST   | `/api/sessions/login`    | Inicio de sesión (setea la cookie `currentUser`) |
| GET    | `/api/events`            | Listado con filtros, paginación y orden          |
| GET    | `/api/events/:id`        | Detalle de un evento                             |

### Protegidas

| Método | Ruta                     | Acceso                        | Respuestas                   |
| ------ | ------------------------ | ----------------------------- | ---------------------------- |
| GET    | `/api/sessions/current`  | Cualquier usuario autenticado | 200, 401                     |
| POST   | `/api/sessions/logout`   | Cualquier usuario autenticado | 200, 401                     |
| POST   | `/api/events`            | `organizer`, `admin`          | 201, 400, 401, 403, 409      |
| PUT    | `/api/events/:id`        | Dueño del evento o `admin`    | 200, 400, 401, 403, 404, 409 |
| PATCH  | `/api/events/:id/status` | Dueño del evento o `admin`    | 200, 400, 401, 403, 404, 409 |
| GET    | `/api/categories`        | Cualquier usuario autenticado | 200, 401                     |
| POST   | `/api/categories`        | `admin`                       | 201, 400, 401, 403, 409      |
| GET    | `/api/users`             | `admin`                       | 200, 401, 403                |
| PATCH  | `/api/users/:uid/role`   | `admin`                       | 200, 400, 401, 403, 404      |

No existe `DELETE` de eventos: los eventos no se eliminan físicamente, se cancelan.

## Códigos de respuesta

| Código | Cuándo                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------- |
| 400    | Datos inválidos: validación del modelo, formato de fechas, filtros o parámetros incorrectos    |
| 401    | **Sin sesión**: no hay cookie, o el token es inválido o expiró                                 |
| 403    | **Sin permisos**: hay sesión, pero el rol no alcanza o el evento es de otro organizer          |
| 404    | El evento no existe (o es un borrador al que el usuario no tiene acceso)                       |
| 409    | Conflicto de estado: evento cancelado, transición no permitida                                 |
| 500    | Solo errores internos inesperados; nunca se usa para autenticación, autorización ni validación |

### 401 vs 403

- **401 Unauthorized (no autenticado):** el servidor no sabe quién sos. Se resuelve iniciando sesión.
- **403 Forbidden (sin permisos):** el servidor sabe quién sos, pero tu rol (o tu relación con el recurso) no permite la acción. Volver a iniciar sesión no lo soluciona.

```json
// 401: ruta privada sin cookie
{ "status": "error", "message": "No autenticado" }
```

```json
// 403: POST /api/events con rol user
{ "status": "error", "message": "No tenés permisos para realizar esta acción" }
```

```json
// 403: organizer modificando un evento ajeno
{ "status": "error", "message": "No tenés permisos para modificar este evento" }
```

```json
// 409: modificar un evento cancelado
{ "status": "error", "message": "Un evento cancelado no puede modificarse" }
```

## Eventos (clases)

### Modelo

| Campo         | Tipo                    | Reglas                                                                                                            |
| ------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `code`        | String                  | Único. Si no se envía, se genera automáticamente (`CLS-XXXX`)                                                     |
| `title`       | String                  | Obligatorio, mínimo 3 caracteres                                                                                  |
| `description` | String                  | Obligatoria, mínimo 10 caracteres                                                                                 |
| `category`    | ObjectId → `categories` | Obligatoria. En la API se envía el **nombre** de la categoría (por ejemplo `"Karate"`), sin distinguir mayúsculas |
| `date`        | Date                    | Obligatoria. Inicio de la clase                                                                                   |
| `endDate`     | Date                    | Obligatoria. Debe ser posterior a `date`                                                                          |
| `location`    | String                  | Obligatoria                                                                                                       |
| `capacity`    | Number                  | Entero mayor a 0                                                                                                  |
| `price`       | Number                  | Mayor o igual a 0 (por defecto 0)                                                                                 |
| `status`      | String                  | `draft`, `published`, `cancelled` o `finished` (por defecto `draft`)                                              |
| `organizer`   | ObjectId → `users`      | Referencia al usuario que creó el evento. Se asigna desde la sesión; **no se acepta en el body**                  |

Las fechas se envían en formato ISO 8601 con offset, por ejemplo `2026-10-12T19:00:00-03:00` (hora de Argentina), y se guardan en UTC.

### Estados y transiciones

| Estado actual | Puede pasar a            |
| ------------- | ------------------------ |
| `draft`       | `published`, `cancelled` |
| `published`   | `cancelled`, `finished`  |
| `cancelled`   | ninguno (estado final)   |
| `finished`    | ninguno (estado final)   |

Cancelar un evento es cambiar su `status` a `cancelled`; el documento no se elimina.

### Reglas de negocio

Todas viven en `services/events.service.js`:

- **Creación:** no se permite una fecha pasada, `endDate` debe ser posterior a `date`, `capacity` debe ser un entero mayor a 0 y `price` mayor o igual a 0. Solo se puede crear como `draft` o `published`. El `organizer` se toma siempre de `req.user`.
- **Edición (`PUT`):** solo se aceptan los campos `code`, `title`, `description`, `price`, `capacity`, `category`, `date`, `endDate` y `location`. El estado se cambia únicamente con `PATCH /:id/status`, y `organizer` no se puede modificar. No se puede reprogramar un evento a una fecha pasada, pero sí editar otros campos de un evento que ya comenzó.
- **Eventos cancelados:** son inmutables. No se pueden editar ni cambiar de estado (409). No se admite ninguna excepción.
- **Publicación:** no se puede publicar un evento finalizado ni cancelado, ni uno cuya fecha ya pasó (409).
- **Propiedad:** un `organizer` solo modifica sus propios eventos (403 si es ajeno); un `admin` puede modificar cualquiera. Primero se verifica que el evento exista (404) y después los permisos (403).
- **Visibilidad:** los borradores solo los ven su organizer y los admins. Para cualquier otra persona no existen: no aparecen en el listado y `GET /:id` responde 404.

### Listado: `GET /api/events`

Ruta pública (con sesión se ven además los borradores propios o, si es admin, todos).

| Parámetro  | Descripción                                                                                                           | Ejemplo               |
| ---------- | --------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `status`   | `draft`, `published`, `cancelled` o `finished`                                                                        | `status=published`    |
| `category` | Nombre de la categoría (sin distinguir mayúsculas). Si no existe, devuelve una lista vacía                            | `category=Karate`     |
| `location` | Texto contenido en la ubicación (sin distinguir mayúsculas)                                                           | `location=ring`       |
| `dateFrom` | Eventos desde esta fecha (inclusive)                                                                                  | `dateFrom=2026-10-01` |
| `dateTo`   | Eventos hasta esta fecha (inclusive: incluye todo el día)                                                             | `dateTo=2026-10-31`   |
| `page`     | Número de página (por defecto 1)                                                                                      | `page=2`              |
| `limit`    | Eventos por página (por defecto 10, máximo 50)                                                                        | `limit=5`             |
| `sort`     | Campo de orden: `date` (por defecto), `price`, `capacity`, `title` o `createdAt`. Con `-` adelante, orden descendente | `sort=-date`          |

`dateFrom` y `dateTo` aceptan una fecha simple (`2026-10-01`, interpretada en hora de Argentina, UTC-3) o una fecha completa con hora y offset. Un valor inválido en cualquier parámetro responde 400 con un mensaje que indica cuál es.

Ejemplo: `GET /api/events?status=published&category=Karate&page=2&limit=5&sort=-date`

```json
{
  "status": "success",
  "data": [
    {
      "_id": "6690a1b2c3d4e5f607182930",
      "code": "CLS-MG1X2Y3Z",
      "title": "Karate iniciación",
      "description": "Técnica básica de guardia y desplazamientos",
      "category": { "_id": "6690...", "name": "Karate", "color": "#dc2626" },
      "organizer": {
        "_id": "665f...",
        "first_name": "Ana",
        "last_name": "Pérez"
      },
      "date": "2026-10-12T22:00:00.000Z",
      "endDate": "2026-10-12T23:00:00.000Z",
      "location": "Ring principal",
      "capacity": 20,
      "price": 0,
      "status": "published"
    }
  ],
  "page": 2,
  "limit": 5,
  "total": 12,
  "totalPages": 3
}
```

### Crear un evento

`POST /api/events` (organizer o admin)

```json
{
  "title": "Karate iniciación",
  "description": "Técnica básica de guardia y desplazamientos",
  "capacity": 20,
  "category": "Karate",
  "date": "2026-10-12T19:00:00-03:00",
  "endDate": "2026-10-12T20:00:00-03:00",
  "location": "Ring principal",
  "status": "published"
}
```

Respuesta `201`:

```json
{
  "status": "success",
  "payload": {
    "_id": "6690...",
    "title": "Karate iniciación",
    "status": "published",
    "organizer": "665f..."
  }
}
```

### Cambiar el estado

`PATCH /api/events/:id/status` (dueño o admin)

```json
{ "status": "cancelled" }
```

Respuesta `200` con el evento actualizado. Una transición no permitida responde `409`.

## Casos de prueba

### Eventos

| Caso                                                          | Resultado esperado                                      |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| Crear evento con rol `user`                                   | 403                                                     |
| Crear evento con fecha pasada                                 | 400                                                     |
| Crear evento con `capacity: 0`                                | 400                                                     |
| `organizer` modifica un evento propio                         | 200                                                     |
| `organizer` modifica un evento ajeno                          | 403                                                     |
| `admin` modifica el evento de otro organizer                  | 200                                                     |
| Cambiar el estado de un evento cancelado                      | 409                                                     |
| Listar con `?status=published&category=Karate&page=2&limit=5` | 200 con `data`, `page`, `limit`, `total` y `totalPages` |
| Consultar un evento inexistente                               | 404                                                     |

### Autenticación y roles

| Caso                                      | Resultado esperado     |
| ----------------------------------------- | ---------------------- |
| Cualquier ruta privada sin cookie         | 401                    |
| `POST /api/events` con rol `organizer`    | 201                    |
| `GET /api/users` con rol `organizer`      | 403                    |
| `GET /api/users` con rol `admin`          | 200                    |
| Registro con `"role": "admin"` en el body | Se crea con rol `user` |

## Evidencia

Las capturas están en `docs/capturas/`:
