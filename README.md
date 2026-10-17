# Box Club Tucumán · API de eventos e inscripciones

API REST para la plataforma de clases de **Box Club Tucumán**, un club de deportes de contacto de San Miguel de Tucumán.
Los organizadores publican clases (eventos) de boxeo, kickboxing, MMA, taekwondo y funcional, y los
alumnos se inscriben reservando lugares (tickets). La API controla el cupo de cada clase, evita
inscripciones duplicadas y envía un email de confirmación con el código de reserva.

Incluye autenticación con JWT en cookie `httpOnly`, autorización por roles y una arquitectura
profesional por capas (routes → controllers → services → repositories → DAO → models, con DTOs
en las respuestas).

## Índice

- [Tecnologías](#tecnologías)
- [Instalación](#instalación)
- [Variables de entorno](#variables-de-entorno)
- [Comandos](#comandos)
- [Usuarios de prueba](#usuarios-de-prueba)
- [Roles y permisos](#roles-y-permisos)
- [Flujo de autenticación](#flujo-de-autenticación)
- [Flujo de inscripción](#flujo-de-inscripción)
- [Front](#front)
- [Endpoints](#endpoints)
- [Ejemplos de uso](#ejemplos-de-uso)
- [Arquitectura en capas](#arquitectura-en-capas)
- [Manejo de errores](#manejo-de-errores)
- [Tests](#tests)
- [Postman y evidencia](#postman-y-evidencia)

## Tecnologías

| Uso | Tecnología |
|---|---|
| Runtime y servidor | Node.js (ES Modules), Express 5 |
| Base de datos | MongoDB (Atlas) con Mongoose 9 |
| Autenticación | Passport (`passport-local`, `passport-jwt`), jsonwebtoken, cookie-parser |
| Contraseñas | bcrypt |
| Emails | Nodemailer (SMTP) |
| Front | express-handlebars + CSS y JavaScript vanilla (módulos ES), Google Fonts (Anton, Barlow Condensed, Barlow) |
| Configuración | dotenv |
| Tests | Mocha, Chai, Supertest |
| Desarrollo | nodemon |

## Instalación

Requisitos:

- Node.js `^20.19.0` o `>=22.12.0` (lo exige Mocha 12, usado en los tests).
- Una base MongoDB. Se recomienda un replica set, como **MongoDB Atlas**, porque las
  inscripciones usan transacciones para que dos pedidos simultáneos no superen el cupo.

```bash
git clone https://github.com/elias-pomo/proyectBackendII.git
cd proyectBackendII
npm install
cp .env.example .env      # en Windows (cmd): copy .env.example .env  → completar los valores
npm run seed              # crea los usuarios de prueba, las categorías y clases de ejemplo
npm run dev               # http://localhost:8080
```

## Variables de entorno

Se leen del archivo `.env` en la raíz (ver `.env.example`). El `.env` no se sube al repositorio:
ninguna credencial está escrita en el código.

| Variable | Obligatoria | Ejemplo | Descripción |
|---|---|---|---|
| `PORT` | No | `8080` | Puerto del servidor. Si falta, usa `8080` |
| `NODE_ENV` | No | `development` | `development`, `production` o `test`. En `production` la cookie se marca `secure` (solo HTTPS) y el seed no se ejecuta |
| `JWT_SECRET` | **Sí** | `una-clave-larga-y-aleatoria` | Clave para firmar los JWT (y la sesión de Express) |
| `JWT_EXPIRES_IN` | **Sí** | `1h` | Duración del token (formato de `jsonwebtoken`: `30m`, `1h`, `7d`) |
| `MONGO_URL` | **Sí** | `mongodb+srv://usuario:clave@cluster0.xxxxx.mongodb.net` | URI de MongoDB. En local: `mongodb://127.0.0.1:27017` (sin replica set no hay transacciones) |
| `DB_NAME` | **Sí** | `ringo_box_gym` | Nombre de la base. Los tests usan `<DB_NAME>_test` |
| `MAIL_HOST` | No | `smtp.gmail.com` | Servidor SMTP |
| `MAIL_PORT` | No | `587` | `587` (STARTTLS) o `465` (TLS directo) |
| `MAIL_USER` | No | `tucuenta@gmail.com` | Usuario SMTP |
| `MAIL_PASS` | No | `xxxx xxxx xxxx xxxx` | Contraseña SMTP (en Gmail, una [contraseña de aplicación](https://myaccount.google.com/apppasswords)) |
| `MAIL_FROM` | No | `Box Club Tucumán <tucuenta@gmail.com>` | Remitente de los emails |

Si falta alguna `MAIL_*`, la API funciona igual pero no envía los emails de confirmación y
cancelación (solo lo avisa en el log).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el servidor con nodemon (se reinicia al guardar) |
| `npm start` | Levanta el servidor con node |
| `npm run seed` | Carga usuarios de prueba, las 5 disciplinas y la grilla de clases de las próximas semanas. No duplica datos si se corre de nuevo |
| `npm test` | Corre los tests unitarios y después los de integración |
| `npm run test:unit` | Solo tests unitarios (no necesitan base de datos) |
| `npm run test:integration` | Solo tests de integración (necesitan `MONGO_URL`) |

## Usuarios de prueba

`npm run seed` crea un usuario por rol (contraseñas solo para pruebas locales):

| Rol | Email | Contraseña |
|---|---|---|
| `admin` | `admin@ringobox.test` | `Admin123!` |
| `organizer` (Lucía Ferreyra: boxeo, kickboxing y funcional) | `organizer@ringobox.test` | `Organizer123!` |
| `organizer` (Martín Gómez: MMA y taekwondo) | `organizer2@ringobox.test` | `Organizer123!` |
| `user` | `user@ringobox.test` | `User123!` |
| `user` | `user2@ringobox.test` | `User123!` |

También crea las disciplinas **Boxeo**, **Kickboxing**, **Funcional**, **MMA** (permite reservar
1 lugar por inscripción) y **Taekwondo**, y la **grilla semanal** del club para la semana actual y
las 3 siguientes: de lunes a sábado, con turnos de mañana y de tarde (22 clases por semana), cada una
con su sala (Ring principal, Sala de combate, Sala funcional, Jaula), cupo y precio. Las clases que ya
pasaron no se crean, y volver a correr el seed agrega las semanas que falten sin duplicar nada.

Para crear otros usuarios:

1. Registrarse con `POST /api/sessions/register`: siempre se crea con rol `user`.
2. Iniciar sesión como admin y cambiar el rol con `PATCH /api/users/:uid/role` (`{ "role": "organizer" }`).

## Roles y permisos

| Rol | Descripción |
|---|---|
| `user` | Rol por defecto. Se inscribe a clases y cancela sus propios tickets. |
| `organizer` | Además crea clases y solo modifica o cancela las suyas. Ve las inscripciones de sus clases. |
| `admin` | Gestiona cualquier clase, ticket, categoría y usuario. |

El registro público siempre crea un `user`: cualquier `role` enviado en el body se ignora.

| Acción | Sin sesión | user | organizer | admin |
|---|---|---|---|---|
| Registrarse / iniciar sesión | ✅ | ✅ | ✅ | ✅ |
| Listar y ver eventos publicados | ✅ | ✅ | ✅ | ✅ |
| Ver sesión actual / cerrar sesión | ❌ 401 | ✅ | ✅ | ✅ |
| Inscribirse a un evento | ❌ 401 | ✅ | ✅ | ✅ |
| Ver mis tickets / cancelar un ticket propio | ❌ 401 | ✅ | ✅ | ✅ |
| Cancelar el ticket de otra persona | ❌ 401 | ❌ 403 | ❌ 403 | ✅ |
| Crear evento | ❌ 401 | ❌ 403 | ✅ | ✅ |
| Modificar / cambiar estado de un evento propio | ❌ 401 | ❌ 403 | ✅ | ✅ |
| Modificar / cambiar estado de un evento ajeno | ❌ 401 | ❌ 403 | ❌ 403 | ✅ |
| Ver inscriptos de un evento | ❌ 401 | ❌ 403 | ✅ (los suyos) | ✅ |
| Crear o editar categorías | ❌ 401 | ❌ 403 | ❌ 403 | ✅ |
| Listar usuarios / cambiar roles | ❌ 401 | ❌ 403 | ❌ 403 | ✅ |

El **401** lo responde el middleware `auth` (no hay sesión o el token no es válido) y el **403**
el middleware `authorizeRoles(...)` (hay sesión pero el rol no alcanza). Que un organizer sea
dueño del evento se valida en el service.

## Flujo de autenticación

```
POST /register ──► Passport "register" ──► valida campos, email único, hashea con bcrypt, role = user
POST /login    ──► Passport "login"    ──► compara con bcrypt ──► firma un JWT { _id, name, email, role }
                                           └► cookie currentUser (httpOnly, sameSite strict, secure en producción)
GET  /current  ──► Passport "current" (JWT desde la cookie) ──► busca el usuario sin password ──► DTO { _id, email, role }
POST /logout   ──► borra la cookie ──► las siguientes requests protegidas responden 401
```

- El JWT nunca lleva la contraseña, y ninguna respuesta la incluye (ni hasheada).
- Como el token viaja en una cookie `httpOnly`, el JavaScript del navegador no puede leerlo.
  En Postman y en el navegador la cookie se envía sola en cada request.

## Flujo de inscripción

`POST /api/events/:eid/tickets` con `{ "quantity": 1 }`:

1. **Sesión**: sin cookie válida → `401`.
2. **Transacción**: se bloquea el evento (`lockForBooking`) para que dos pedidos simultáneos no
   tomen el mismo lugar.
3. **Evento**: inexistente → `404`; `cancelled`, `finished` o `draft`, o la clase ya empezó → `409`.
4. **Cantidad**: no es un entero mayor a 0 → `400`; supera el máximo por inscripción de la categoría → `400`.
5. **Duplicado**: el usuario ya tiene un ticket activo (`confirmed` o `pending`) para ese evento → `409`.
6. **Cupo**: `capacity` menos los lugares de los tickets activos. Si no alcanza → `409`.
   Los tickets `cancelled` no ocupan cupo.
7. Se crea el ticket `confirmed` con un `reservationCode` único → `201`.
8. Después de confirmar la transacción se envía el **email de confirmación** con Nodemailer. Si el
   email falla, la inscripción queda igual.

Cancelar (`PATCH /api/tickets/:tid/cancel`) no borra el ticket: lo marca `cancelled`, guarda
`cancelledAt`, libera el cupo y avisa por email al dueño.

## Front

Interfaz web servida por la misma app (Handlebars + CSS + JS vanilla, sin build). Las vistas solo
arman la estructura: cada página pide sus datos a la API desde el navegador, con la misma cookie
de sesión. La identidad visual y los tokens están documentados en
[`design-system/box-club-tucuman/MASTER.md`](design-system/box-club-tucuman/MASTER.md).

| Ruta | Acceso | Qué tiene |
|---|---|---|
| `/` | Público | Inicio: próxima clase, disciplinas y cómo funciona |
| `/clases` | Público | Cartelera agrupada por día, con filtros (disciplina, fechas, lugar), orden y paginación |
| `/clases/:id` | Público | Detalle de la clase. Con sesión: reserva con cantidad de lugares y código de reserva |
| `/mis-reservas` | Autenticado | Próximas reservas e historial, con cancelación |
| `/panel` | `organizer`, `admin` | Mis clases: crear, editar, publicar, cancelar y ver inscriptos con el cupo ocupado |
| `/admin` | `admin` | Usuarios y cambio de rol, disciplinas |
| `/login`, `/registro` | Sin sesión | Acceso. Si una página pide sesión, después del login vuelve a ella |

Una página protegida sin sesión redirige a `/login`; con sesión pero sin el rol muestra un 403.

## Endpoints

Base URL: `http://localhost:8080`

### Sesiones `/api/sessions`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/register` | Público | Registra un usuario (`first_name`, `last_name`, `email`, `password`) |
| POST | `/login` | Público | Inicia sesión y setea la cookie `currentUser` |
| GET | `/current` | Autenticado | Usuario de la sesión actual |
| POST | `/logout` | Autenticado | Cierra la sesión (borra la cookie) |

### Eventos `/api/events`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/` | Público | Listado con filtros, orden y paginación |
| GET | `/:id` | Público | Detalle (los `draft` solo los ven su organizer y admin) |
| POST | `/` | `organizer`, `admin` | Crea un evento (como `draft` o `published`) |
| PUT | `/:id` | Dueño o `admin` | Modifica un evento (no si está cancelado) |
| PATCH | `/:id/status` | Dueño o `admin` | Cambia el estado: `draft → published/cancelled`, `published → cancelled/finished` |
| POST | `/:eid/tickets` | Autenticado | Inscribirse |
| GET | `/:eid/tickets` | Dueño del evento o `admin` | Inscriptos y resumen de cupo |

Query params de `GET /api/events`:

| Param | Ejemplo | Descripción |
|---|---|---|
| `status` | `published` | `draft`, `published`, `cancelled` o `finished` |
| `category` | `Boxeo` | Nombre de la categoría (sin distinguir mayúsculas) |
| `location` | `ring` | Búsqueda parcial en la ubicación |
| `dateFrom`, `dateTo` | `2026-11-01` | Rango de fechas (incluye ambos días, hora de Argentina) |
| `sort` | `-date` | `date`, `price`, `capacity`, `title` o `createdAt`; con `-` es descendente |
| `page` | `2` | Página (por defecto `1`) |
| `limit` | `5` | Resultados por página (por defecto `10`, máximo `50`) |

El listado y el detalle suman a cada evento `taken` (lugares de tickets `confirmed`/`pending`) y
`available` (`capacity - taken`, nunca negativo). Las respuestas de crear, editar y cambiar estado no los incluyen.

### Tickets `/api/tickets`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/my-tickets` | Autenticado | Mis tickets, con los datos básicos del evento (`populate`) |
| PATCH | `/:tid/cancel` | Dueño del ticket o `admin` | Cancela el ticket (no lo borra) |

### Categorías `/api/categories` y usuarios `/api/users`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/categories` | Autenticado | Lista de categorías |
| POST | `/api/categories` | `admin` | Crea una categoría |
| PATCH | `/api/categories/:id` | `admin` | Edita descripción, color o máximo por inscripción |
| GET | `/api/users` | `admin` | Lista de usuarios (sin password) |
| PATCH | `/api/users/:uid/role` | `admin` | Cambia el rol de un usuario |

## Ejemplos de uso

Con curl, guardando la cookie de sesión en un archivo (`-c` la guarda, `-b` la envía).

**Login**

```bash
curl -c cookies.txt -X POST http://localhost:8080/api/sessions/login \
  -H "Content-Type: application/json" \
  -d '{"email":"organizer@ringobox.test","password":"Organizer123!"}'
```

```json
{ "status": "success", "message": "Login exitoso", "user": { "_id": "6ad3...", "name": "Lucía", "email": "organizer@ringobox.test", "role": "organizer" } }
```

**Crear un evento** (organizer)

```bash
curl -b cookies.txt -X POST http://localhost:8080/api/events \
  -H "Content-Type: application/json" \
  -d '{"title":"Boxeo iniciación","description":"Técnica básica de guardia","category":"Boxeo","date":"2026-12-01T19:00:00-03:00","endDate":"2026-12-01T20:00:00-03:00","location":"Ring principal","capacity":15,"price":5000,"status":"published"}'
```

```json
{ "status": "success", "payload": { "_id": "6ad3...", "code": "CLS-MVCUE1QT", "title": "Boxeo iniciación", "category": "6abd...", "capacity": 15, "price": 5000, "status": "published", "organizer": "6ad3..." } }
```

**Listado paginado**: `GET /api/events?status=published&page=2&limit=5` → `200`

```json
{
  "status": "success",
  "data": [ { "_id": "6ad3...", "title": "MMA fundamentos", "status": "published", "category": { "name": "MMA" } } ],
  "page": 2,
  "limit": 5,
  "total": 18,
  "totalPages": 4
}
```

**Inscribirse**: `POST /api/events/:eid/tickets` con `{ "quantity": 1 }` → `201`

```json
{ "status": "success", "payload": { "_id": "6ad3...", "user": "6ad3...", "event": "6ad3...", "status": "confirmed", "quantity": 1, "reservationCode": "RES-39A15467", "cancelledAt": null, "createdAt": "2026-10-17T20:21:41.152Z" } }
```

**Inscripción duplicada o sin cupo** → `409`

```json
{ "status": "error", "message": "Ya tenés una inscripción activa para este evento" }
{ "status": "error", "message": "No hay cupos disponibles para este evento" }
```

**Mis tickets**: `GET /api/tickets/my-tickets` → `200` (el evento viene poblado, sin datos internos)

```json
{ "status": "success", "payload": [ { "_id": "6ad3...", "event": { "_id": "6ad3...", "title": "Boxeo iniciación", "date": "2026-12-01T22:00:00.000Z", "location": "Ring principal", "status": "published" }, "status": "confirmed", "quantity": 1, "reservationCode": "RES-39A15467" } ] }
```

## Arquitectura en capas

```
Request → Route → Middlewares → Controller → Service → Repository → DAO → Model → MongoDB
                                    ↓
                                   DTO → Response
```

```
src/
├── app.js, server.js     # configuración de Express y arranque
├── container.js          # instancia DAOs, repositories y services (inyección de dependencias)
├── config/               # variables de entorno, conexión a Mongo y Passport
├── constants/            # estados de evento/ticket y roles
├── routes/               # rutas de la API y de las vistas
├── middlewares/          # auth (401), authorizeRoles (403), errores, vistas
├── controllers/          # request/response
├── services/             # lógica de negocio y envío de emails
├── repositories/         # operaciones de dominio
├── dao/                  # acceso a datos (único lugar que importa los modelos)
├── models/               # esquemas de Mongoose: User, Event, Ticket, Category
├── dto/                  # qué campos salen en cada respuesta
├── strategies/           # estrategias de Passport: register, login, current
├── utils/                # AppError, hash, jwt, logger, transacciones
├── scripts/seed.js       # datos de prueba
└── views/                # vistas Handlebars
```

| Capa | Carpeta | Responsabilidad | Qué NO hace |
|---|---|---|---|
| **Model** | `src/models/` | Esquemas de Mongoose con sus validaciones. | Solo los importan los DAO |
| **DAO** | `src/dao/` | Único acceso a los modelos. Expone operaciones de datos (`findById`, `create`, `update`, `count`, `paginate`...). | No tiene reglas de negocio |
| **Repository** | `src/repositories/` | Traduce el dominio a operaciones del DAO (`findByEmail`, `findPublishedEvents`, `countActiveSeats`, `cancelTicket`...). | No importa modelos |
| **Service** | `src/services/` | Toda la lógica de negocio: cupos, estados, duplicados, permisos sobre recursos propios, transacciones y envío de email. | No importa DAOs ni modelos |
| **DTO** | `src/dto/` | Define qué campos salen en cada respuesta, también de los documentos poblados con `populate`. | No consulta datos |
| **Controller** | `src/controllers/` | Extrae datos del request, llama al service y responde pasando por el DTO. | No calcula cupos ni valida reglas |
| **Middlewares** | `src/middlewares/` | Autenticación (`auth`), autorización por rol (`authorizeRoles`) y manejo centralizado de errores. | — |

### Seguridad de las respuestas

Ninguna respuesta incluye `password`, ni siquiera hasheada. Cada DTO arma la respuesta campo por
campo (lista blanca), así que un campo nuevo en el modelo nunca se filtra por accidente. Los
documentos poblados también pasan por el DTO: del usuario de un ticket solo salen `_id`,
`first_name`, `last_name` y `email`.

## Manejo de errores

Un solo formato en toda la API, producido por el middleware centralizado
`src/middlewares/errorHandler.js`:

```json
{ "status": "error", "message": "Descripción del problema" }
```

Los services lanzan `AppError(message, status)` y el middleware responde con ese código.

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos: campos faltantes, formato, id mal formado, fecha pasada, `capacity` ≤ 0, `price` < 0, cantidad inválida |
| 401 | Sin sesión o token inválido; credenciales incorrectas |
| 403 | Sesión válida sin permisos para la acción |
| 404 | Recurso inexistente (también rutas `/api` que no existen) |
| 409 | Conflicto: email repetido, inscripción duplicada, sin cupo, evento cancelado o estado que no admite la acción |
| 500 | Error interno: se registra en el logger y se responde un mensaje genérico, sin detalles |

## Tests

Están hechos con **Mocha + Chai + Supertest** y separados en dos carpetas:

| Carpeta | Tipo | Qué prueba | Necesita base |
|---|---|---|---|
| `tests/unit/` | Unitarios | Services (`Sessions`, `Users`, `Events`, `Tickets`) con repositorios falsos, y los DTOs (que nunca salga `password`, que los `populate` se filtren) | No |
| `tests/integration/` | Integración | La API completa con Supertest: el flujo registro → login → current → logout, evento → inscripción → cancelación, los códigos 400/401/403/404/409 y las inscripciones concurrentes | Sí |

- Los tests de integración usan siempre la base `<DB_NAME>_test`, la vacían antes y después, y
  se niegan a limpiar una base cuyo nombre no termine en `_test`. Nunca tocan la base de desarrollo.
- Si `MONGO_URL` no está definida, `npm test` corre los unitarios y saltea los de integración con un aviso.
- Los tests de concurrencia necesitan un replica set (Atlas lo es) y se omiten si no lo hay.
- Durante los tests no se envían emails reales.

## Postman y evidencia

- **Colección de Postman**: [`docs/RingoBoxGym.postman_collection.json`](docs/RingoBoxGym.postman_collection.json).
  Importarla en Postman, correr `npm run seed`, levantar el servidor y ejecutarla con el
  *Collection Runner* en orden. Recorre los 10 casos del flujo completo con tests automáticos en
  cada request (el login de cada rol guarda la cookie y los ids se pasan entre requests como
  variables de la colección). También se puede correr por consola con
  `npx newman run docs/RingoBoxGym.postman_collection.json`.
- **Capturas del flujo completo**: [`src/evidencia/entrega-final/`](src/evidencia/entrega-final)

| # | Caso | Captura |
|---|---|---|
| 1 | Registro → login → `/current` → logout → `/current` 401 | `01-registro-login-current-logout.png` |
| 2 | `user` intenta crear evento → 403 (y sin sesión → 401) | `02-user-crea-evento-403.png` |
| 3 | `organizer` crea evento → `user` se inscribe → cupo descontado | `03-organizer-crea-user-se-inscribe-cupo.png` |
| 4 | Inscripción duplicada → 409 | `04-inscripcion-duplicada-409.png` |
| 5 | Inscripción sin cupo → 409 | `05-inscripcion-sin-cupo-409.png` |
| 6 | Cancelar ticket → cupo liberado → nueva inscripción | `06-cancelar-libera-cupo-reinscripcion.png` |
| 7 | `organizer` modifica evento ajeno → 403 | `07-organizer-modifica-evento-ajeno-403.png` |
| 8 | `admin` modifica evento de otro organizador → 200 | `08-admin-modifica-evento-ajeno-200.png` |
| 9 | Respuestas de usuario, evento y ticket sin `password` | `09-respuestas-sin-password.png` |
| 10 | `?status=published&page=2&limit=5` → listado paginado | `10-listado-paginado.png` |

Las capturas de las pre-entregas anteriores siguen en `src/evidencia/`.
