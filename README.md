# Ringo Box Gym: API de clases, inscripciones y tickets

API REST de un gimnasio ficticio orientado a deportes de contacto (boxeo, karate, taekwondo, musculación). Los **eventos** son las clases del gimnasio y los usuarios se inscriben a ellas mediante **tickets**, con control de cupos. Incluye autenticación con JWT en cookie, autorización por roles (`user`, `organizer`, `admin`), CRUD de eventos con reglas de negocio, filtros, paginación y ordenamiento, y un email de confirmación al inscribirse.

## Stack

Node.js (ES modules), Express 5, MongoDB con Mongoose, Passport (estrategias local y JWT), jsonwebtoken, cookie-parser, bcrypt, Nodemailer y Handlebars. Tests con Mocha, Chai y Supertest.

## Instalación y ejecución

```bash
git clone https://github.com/elias-pomo/proyectBackendII.git
cd proyectBackendII
npm install
cp .env.example .env     # completar los valores
npm run dev              # desarrollo (nodemon)
npm start                # producción
npm test                 # tests (ver la sección Tests)
```

Requiere Node.js 20.11 o superior.

### Variables de entorno

| Variable         | Descripción                                                               |
| ---------------- | ------------------------------------------------------------------------- |
| `PORT`           | Puerto del servidor                                                       |
| `NODE_ENV`       | `development` o `production` (en producción la cookie se marca `secure`)  |
| `SECRET`         | Secreto para firmar los JWT                                               |
| `JWT_EXPIRES_IN` | Duración del token (por ejemplo `1h`)                                     |
| `MONGO_URL`      | URL de conexión a MongoDB                                                 |
| `DB_NAME`        | Nombre de la base de datos                                                |
| `MAIL_HOST`      | Servidor SMTP (por ejemplo `smtp.gmail.com`)                              |
| `MAIL_PORT`      | Puerto SMTP (`465` usa TLS directo; `587` usa STARTTLS)                   |
| `MAIL_USER`      | Usuario de la cuenta de correo                                            |
| `MAIL_PASS`      | Contraseña de la cuenta (con Gmail, una _contraseña de aplicación_)       |
| `MAIL_FROM`      | Remitente de los correos (por ejemplo `Ringo Box Gym <correo@gmail.com>`) |

Las credenciales de email nunca están en el código: se leen del `.env`, que no se versiona. `.env.example` lista todas las variables sin valores reales.

### Configuración del email

- **Gmail:** activar la verificación en dos pasos en la cuenta y crear una _contraseña de aplicación_; esa contraseña va en `MAIL_PASS`. Host `smtp.gmail.com` y puerto `465`.
- **Mailtrap (sandbox):** usar el host, puerto, usuario y contraseña SMTP que muestra su panel. Los correos no llegan a una casilla real: se ven en el panel de Mailtrap.
- Si faltan las variables `MAIL_*`, el servidor arranca igual: la inscripción se confirma y en la consola aparece un aviso de que el email no se envió.

## Arquitectura

Cada capa tiene una única responsabilidad:

| Capa          | Responsabilidad                                                                      |
| ------------- | ------------------------------------------------------------------------------------ |
| `routes`      | Define las rutas y encadena los middlewares de acceso                                |
| `controllers` | Solo manejan request y response; no contienen lógica de negocio                      |
| `services`    | Reglas de negocio y validaciones (fechas, estados, cupos, permisos sobre el recurso) |
| `dao`         | Acceso a datos (consultas a MongoDB)                                                 |
| `models`      | Esquemas de Mongoose                                                                 |

```
src/
├── config/                    # config.js, passport.config.js
├── strategies/                # jwt.strategy.js, login.strategy.js, register.strategy.js
├── controllers/               # events, tickets, categories, sessions, users
├── services/
│   ├── events.service.js      # reglas de negocio de eventos
│   ├── tickets.service.js     # reglas de inscripción, cupos y cancelación
│   └── mail.service.js        # envío de emails con Nodemailer
├── dao/
│   ├── EventsDAO.js
│   ├── TicketsDAO.js
│   ├── CategoriesDAO.js
│   ├── UserDAO.js
│   └── models/                # event, ticket, category, user
├── middlewares/
│   ├── auth.js                # sesión obligatoria (401)
│   ├── authOptional.js        # sesión opcional (visitante o usuario)
│   ├── authorize.js           # authorizeRoles(...roles) (403)
│   └── errorHandler.js        # traduce errores a respuestas HTTP
├── routes/                    # events, tickets, categories, sessions, users
└── utils/AppError.js          # error con código HTTP
tests/                         # setup, helpers y tests de eventos (Mocha, Chai, Supertest)
```

## Autenticación

- El login genera un JWT que se guarda en la cookie `currentUser` (`httpOnly`, `sameSite: strict` y `secure` en producción).
- `auth.js` valida el token con la estrategia `current` de Passport, carga el usuario desde la base en `req.user` y responde **401** si no hay una sesión válida. Como lee el usuario en cada request, un cambio de rol rige de inmediato, sin volver a iniciar sesión.
- `authOptional.js` hace lo mismo pero no corta la request: si no hay sesión, continúa como visitante. Se usa en las rutas de lectura públicas.
- `authorize.js` exporta `authorizeRoles(...roles)`, que compara `req.user.role` con los roles permitidos y responde **403** si no coincide.

## Roles

| Rol         | Descripción                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| `user`      | Rol por defecto al registrarse. Consulta eventos, se inscribe a clases y gestiona sus propios tickets.                      |
| `organizer` | Además crea eventos, **solo modifica los suyos** y ve las inscripciones de sus eventos.                                     |
| `admin`     | Modifica cualquier evento, ve las inscripciones de cualquiera, cancela tickets ajenos, crea categorías y gestiona usuarios. |

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
| Inscribirse a un evento                         | ❌ 401    | ✅     | ✅                  | ✅       |
| Ver mis tickets                                 | ❌ 401    | ✅     | ✅                  | ✅       |
| Cancelar un ticket **propio**                   | ❌ 401    | ✅     | ✅                  | ✅       |
| Cancelar un ticket **ajeno**                    | ❌ 401    | ❌ 403 | ❌ 403              | ✅       |
| Ver las inscripciones de un evento **propio**   | ❌ 401    | ❌ 403 | ✅                  | ✅       |
| Ver las inscripciones de un evento **ajeno**    | ❌ 401    | ❌ 403 | ❌ 403              | ✅       |
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

| Método | Ruta                       | Acceso                                           | Respuestas                   |
| ------ | -------------------------- | ------------------------------------------------ | ---------------------------- |
| GET    | `/api/sessions/current`    | Cualquier usuario autenticado                    | 200, 401                     |
| POST   | `/api/sessions/logout`     | Cualquier usuario autenticado                    | 200, 401                     |
| POST   | `/api/events`              | `organizer`, `admin`                             | 201, 400, 401, 403           |
| PUT    | `/api/events/:id`          | Dueño del evento o `admin`                       | 200, 400, 401, 403, 404, 409 |
| PATCH  | `/api/events/:id/status`   | Dueño del evento o `admin`                       | 200, 400, 401, 403, 404, 409 |
| POST   | `/api/events/:eid/tickets` | Cualquier usuario autenticado                    | 201, 400, 401, 404, 409      |
| GET    | `/api/events/:eid/tickets` | `organizer` dueño del evento o `admin`           | 200, 400, 401, 403, 404      |
| GET    | `/api/tickets/my-tickets`  | Cualquier usuario autenticado (solo los propios) | 200, 401                     |
| PATCH  | `/api/tickets/:tid/cancel` | Dueño del ticket o `admin`                       | 200, 400, 401, 403, 404, 409 |
| GET    | `/api/categories`          | Cualquier usuario autenticado                    | 200, 401                     |
| POST   | `/api/categories`          | `admin`                                          | 201, 400, 401, 403, 409      |
| GET    | `/api/users`               | `admin`                                          | 200, 401, 403                |
| PATCH  | `/api/users/:uid/role`     | `admin`                                          | 200, 400, 401, 403, 404      |

No existe `DELETE` de eventos ni de tickets: nada se elimina físicamente. Los eventos se cancelan y los tickets se marcan como cancelados.

## Códigos de respuesta

| Código | Cuándo                                                                                                                             |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 400    | Datos inválidos: validación del modelo, formato de ids o fechas, filtros o parámetros incorrectos                                  |
| 401    | **Sin sesión**: no hay cookie, o el token es inválido o expiró                                                                     |
| 403    | **Sin permisos**: hay sesión, pero el rol no alcanza o el recurso es de otro usuario                                               |
| 404    | El evento o el ticket no existe (o es un borrador al que el usuario no tiene acceso)                                               |
| 409    | Conflicto de negocio: evento cancelado o finalizado, transición no permitida, sin cupo, inscripción duplicada, ticket ya cancelado |
| 500    | Solo errores internos inesperados; nunca se usa para autenticación, autorización ni validación                                     |

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
// 403: cancelar el ticket de otro usuario
{ "status": "error", "message": "No tenés permisos para cancelar este ticket" }
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
| `capacity`    | Number                  | Entero mayor a 0. Es el cupo total de la clase                                                                    |
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

`PATCH /api/events/:id/status` (dueño o admin), con `{ "status": "cancelled" }`. Responde `200` con el evento actualizado; una transición no permitida responde `409`.

## Tickets e inscripciones

Un **ticket** relaciona a un usuario con un evento: representa su inscripción a una clase.

### Modelo

| Campo                    | Tipo                | Reglas                                                              |
| ------------------------ | ------------------- | ------------------------------------------------------------------- |
| `user`                   | ObjectId → `users`  | Referencia al usuario inscripto (se toma de la sesión)              |
| `event`                  | ObjectId → `events` | Referencia a la clase                                               |
| `status`                 | String              | `confirmed`, `pending` o `cancelled` (por defecto `confirmed`)      |
| `quantity`               | Number              | Entero mayor a 0: cantidad de lugares que reserva (por defecto 1)   |
| `reservationCode`        | String              | Único, autogenerado (`RES-XXXXXXXX`)                                |
| `cancelledAt`            | Date                | `null` hasta que se cancela; después guarda la fecha de cancelación |
| `createdAt`, `updatedAt` | Date                | Generados automáticamente                                           |

El ticket guarda solo **referencias** a `user` y `event`, nunca copias de esos documentos.

### Estados del ticket

| Estado      | Ocupa cupo | Descripción                                                                                                   |
| ----------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| `confirmed` | Sí         | Inscripción confirmada. Es el estado con el que se crean los tickets.                                         |
| `pending`   | Sí         | Lugar reservado a la espera de confirmación. Está previsto para un flujo con pago; hoy no se asigna.          |
| `cancelled` | No         | Inscripción cancelada. Es un estado final: no se reactiva. Para volver a inscribirse se crea un ticket nuevo. |

Los tickets **activos** son los `confirmed` y los `pending`.

### Flujo de inscripción

`POST /api/events/:eid/tickets`, con body opcional `{ "quantity": 1 }` (por defecto 1). Todas las validaciones están en `services/tickets.service.js`, en este orden:

1. Hay sesión válida (401).
2. El evento existe (404; un id mal formado responde 400).
3. El evento está publicado: si está cancelado, finalizado o todavía en borrador, responde 409 con un mensaje que indica cuál es el caso.
4. La clase todavía no empezó (409).
5. `quantity` es un entero mayor a 0 (400).
6. El usuario no tiene ya un ticket activo para ese evento (409). Se permite una inscripción activa por usuario y evento.
7. Hay cupo suficiente (409, con un mensaje que indica cuántos lugares quedan).
   Si todo es válido, se crea el ticket en estado `confirmed` con su `reservationCode` y se envía el email de confirmación.

### Regla de cupos

```
cupos disponibles = capacity del evento − suma de quantity de los tickets activos
```

Solo cuentan los tickets `confirmed` y `pending`; los `cancelled` no ocupan cupo. El cálculo se hace en cada inscripción a partir de los tickets, así que al cancelar un ticket el cupo queda disponible automáticamente.

Ejemplo: un evento con `capacity: 10` tiene tres tickets: A (2 lugares, `confirmed`), B (1 lugar, `confirmed`) y C (3 lugares, `cancelled`). Los lugares ocupados son 3 y los disponibles son 7. Una inscripción de 8 lugares responde `409 No hay cupo suficiente: quedan 7 lugares y pediste 8`.

### Cancelación

`PATCH /api/tickets/:tid/cancel` (dueño del ticket o admin):

- Valida que el ticket exista (404), que pertenezca al solicitante o que este sea admin (403) y que no esté ya cancelado (409).
- Cambia `status` a `cancelled` y registra `cancelledAt`. **No elimina el documento.**

### Consultas

- `GET /api/tickets/my-tickets` devuelve solo los tickets del usuario autenticado, del más reciente al más antiguo, con los datos del evento (`title`, `date`, `endDate`, `location`, `status`) obtenidos por `populate`. No incluye datos de otros usuarios.
- `GET /api/events/:eid/tickets` lo ve el organizer dueño del evento o un admin. Devuelve los tickets con nombre, apellido y email de cada inscripto, y un `summary` con el cupo: `capacity`, `taken` y `available`.

### Ejemplos

`POST /api/events/6690a1b2c3d4e5f607182930/tickets` con `{ "quantity": 1 }`, respuesta `201`:

```json
{
  "status": "success",
  "payload": {
    "_id": "6691b2c3d4e5f60718293041",
    "user": "665f2a...",
    "event": "6690a1b2c3d4e5f607182930",
    "status": "confirmed",
    "quantity": 1,
    "reservationCode": "RES-1A2B3C4D",
    "cancelledAt": null,
    "createdAt": "2026-10-05T14:03:11.000Z"
  }
}
```

`GET /api/tickets/my-tickets`, respuesta `200`:

```json
{
  "status": "success",
  "payload": [
    {
      "_id": "6691b2c3d4e5f60718293041",
      "status": "confirmed",
      "quantity": 1,
      "reservationCode": "RES-1A2B3C4D",
      "event": {
        "_id": "6690a1b2c3d4e5f607182930",
        "title": "Karate iniciación",
        "date": "2026-10-12T22:00:00.000Z",
        "location": "Ring principal"
      }
    }
  ]
}
```

`GET /api/events/:eid/tickets`, respuesta `200`:

```json
{
  "status": "success",
  "payload": [
    {
      "_id": "6691b2c3d4e5f60718293041",
      "status": "confirmed",
      "quantity": 1,
      "reservationCode": "RES-1A2B3C4D",
      "user": {
        "_id": "665f2a...",
        "first_name": "Lucía",
        "last_name": "Gómez",
        "email": "lucia@mail.com"
      }
    }
  ],
  "summary": { "capacity": 20, "taken": 1, "available": 19 }
}
```

Errores de negocio frecuentes:

```json
// 409: ya hay una inscripción activa
{
  "status": "error",
  "message": "Ya tenés una inscripción activa para este evento"
}
```

```json
// 409: no alcanza el cupo
{
  "status": "error",
  "message": "No hay cupo suficiente: quedan 2 lugares y pediste 3"
}
```

```json
// 409: evento cancelado
{
  "status": "error",
  "message": "El evento fue cancelado y no admite inscripciones"
}
```

### Notificación por email

Al confirmarse una inscripción, `services/mail.service.js` envía un email con Nodemailer al correo del usuario. Incluye el nombre de la clase, la fecha y hora (hora de Argentina), la ubicación, la cantidad de lugares y el código de reserva. Se envía en texto y en HTML.

- El envío **no bloquea** la respuesta de la API y un fallo del servidor de correo **no cancela** la inscripción: el error queda registrado en la consola.
- Las credenciales salen de las variables `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` y `MAIL_FROM` (ver la sección de variables de entorno).

### Limitaciones conocidas

- **Concurrencia:** el cupo se calcula con una consulta y después se inserta el ticket. Dos inscripciones simultáneas al último lugar podrían pasar las dos. En un entorno de producción se resolvería con un contador atómico en el evento o con transacciones.
- Cancelar un evento no cancela automáticamente sus tickets.
- Al editar la `capacity` de un evento no se valida que sea mayor a los lugares ya ocupados.

## Tests

Los tests usan Mocha, Chai y Supertest, y se corren con `npm test`. La configuración de Mocha está en `.mocharc.json`.

- Requieren `MONGO_URL` (en el `.env` o como variable de entorno).
- Usan una base distinta de la de desarrollo: `<DB_NAME>_test`, que se vacía al empezar y al terminar. Nunca tocan la base de desarrollo, y la limpieza se niega a correr sobre una base cuyo nombre no termine en `_test`.
- No dependen de datos previos: cada corrida arma sus propios usuarios, categorías y eventos.
  `tests/events.test.js` cubre la creación (fecha pasada, `capacity` y `price` inválidos, categoría inexistente), las transiciones de estado permitidas y prohibidas, el listado (filtros, paginación, orden y parámetros inválidos), la visibilidad de borradores y la autorización por rol y propiedad.

## Casos de prueba manuales

### Tickets

| Caso                                                            | Resultado esperado      |
| --------------------------------------------------------------- | ----------------------- |
| Inscripción exitosa                                             | 201 y email recibido    |
| Inscripción sin sesión                                          | 401                     |
| Inscripción a un evento inexistente                             | 404                     |
| Inscripción a un evento cancelado                               | 409                     |
| Inscripción a un evento finalizado                              | 409                     |
| Inscripción con más lugares de los disponibles                  | 409 con mensaje de cupo |
| Inscripción duplicada con un ticket activo                      | 409                     |
| Cancelación propia, y nueva inscripción por ese cupo            | 200 y después 201       |
| Cancelación de un ticket ajeno como `user`                      | 403                     |
| `GET /api/events/:eid/tickets` como `user`                      | 403                     |
| `GET /api/events/:eid/tickets` como `organizer` de otro evento  | 403                     |
| `GET /api/events/:eid/tickets` como `organizer` dueño o `admin` | 200 con `summary`       |

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
| `GET /api/users` con rol `organizer`      | 403                    |
| `GET /api/users` con rol `admin`          | 200                    |
| Registro con `"role": "admin"` en el body | Se crea con rol `user` |

## Evidencia

Las capturas de los casos de prueba están en la carpeta `src/evidencia/`.
