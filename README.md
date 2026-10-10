# API de Eventos y Tickets

API REST para gestionar eventos (clases) e inscripciones, con autenticación JWT en cookie
HTTP Only, autorización por roles y arquitectura en capas.

## Instalación

```bash
git clone https://github.com/elias-pomo/proyectBackendII.git
cd proyectBackendII
npm install
cp .env.example .env   # completar los valores
npm run dev
```

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor |
| `NODE_ENV` | `development`, `production` o `test` |
| `SECRET` | Clave para firmar los JWT y la sesión |
| `JWT_EXPIRES_IN` | Duración del token (ej. `1h`) |
| `MONGO_URL` | URI de conexión a MongoDB (se recomienda un replica set, como Atlas) |
| `DB_NAME` | Nombre de la base |
| `MAIL_*` | Credenciales SMTP. Si faltan, la API funciona pero no envía emails |

Tests: `npm test`. Los de concurrencia necesitan un replica set y se omiten si no lo hay.

## Arquitectura en capas

```
Request → Route → Middlewares → Controller → Service → Repository → DAO → MongoDB
                                    ↓
                                   DTO → Response
```

| Capa | Carpeta | Responsabilidad | Qué NO hace |
|---|---|---|---|
| **DAO** | `src/dao/` | Único acceso a los modelos de Mongoose. Expone operaciones de datos (`findById`, `create`, `update`, `paginate`...). | No tiene reglas de negocio |
| **Repository** | `src/repositories/` | Traduce el dominio a operaciones del DAO (`findByEmail`, `cancelTicket`, `countActiveSeats`...). | No importa modelos |
| **Service** | `src/services/` | Toda la lógica de negocio: cupos, estados, duplicados, permisos sobre recursos propios, transacciones y envío de email. | No importa DAOs ni modelos |
| **DTO** | `src/dto/` | Define qué campos salen en cada respuesta. Filtra también los documentos relacionados con `populate`. | No consulta datos |
| **Controller** | `src/controllers/` | Extrae datos del request, llama al service y responde pasando por el DTO. | No calcula cupos ni valida reglas |
| **Middlewares** | `src/middlewares/` | Autenticación (`auth`), autorización por rol (`authorizeRoles`) y manejo centralizado de errores. | — |

`src/container.js` es el único lugar donde se instancian los DAO y se conectan las capas
(inyección de dependencias). Las constantes compartidas (estados, roles) viven en
`src/constants/` para que los modelos no dependan de nada de arriba.

### Seguridad de las respuestas

Ninguna respuesta incluye `password`, ni siquiera hasheada. Cada DTO arma la respuesta
campo por campo (lista blanca), así que un campo nuevo en el modelo nunca se filtra por
accidente. Los documentos poblados (`populate`) también pasan por el DTO: del usuario de un
ticket solo salen `_id`, `first_name`, `last_name` y `email`.

### Inscripciones y concurrencia

`TicketsService.createTicket` corre dentro de una transacción de MongoDB. Primero bloquea
el evento (`lockForBooking`), y recién después valida estado, cupo y duplicados, de modo que
dos pedidos simultáneos no puedan superar el cupo. El email se envía después de confirmar la
transacción, y si falla no afecta la inscripción.

## Manejo de errores

Un solo formato en toda la API, producido por `src/middlewares/errorHandler.js`:

```json
{ "status": "error", "message": "Descripción del problema" }
```

Los services lanzan `AppError(message, status)` y el middleware responde con ese código.

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos: campos faltantes, formato, id mal formado, cantidad inválida |
| 401 | Sin sesión o token inválido; credenciales incorrectas |
| 403 | Sesión válida sin permisos para la acción |
| 404 | Recurso inexistente (también rutas `/api` que no existen) |
| 409 | Conflicto: email repetido, inscripción duplicada, sin cupo, estado que no admite la acción |
| 500 | Error interno: se registra en el logger y se responde un mensaje genérico, sin detalles |

## Roles y permisos

| Rol | Descripción |
|---|---|
| `user` | Rol por defecto. Se inscribe a eventos y cancela sus propios tickets. |
| `organizer` | Además crea eventos y solo modifica los suyos. Ve las inscripciones de sus eventos. |
| `admin` | Gestiona cualquier evento, ticket, categoría y usuario. |

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
| Modificar un evento propio / ajeno | ❌ 401 | ❌ 403 | ✅ / ❌ 403 | ✅ / ✅ |
| Ver inscriptos de un evento | ❌ 401 | ❌ 403 | ✅ (los suyos) | ✅ |
| Crear o editar categorías | ❌ 401 | ❌ 403 | ❌ 403 | ✅ |
| Listar usuarios / cambiar roles | ❌ 401 | ❌ 403 | ❌ 403 | ✅ |

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/sessions/register` | Público |
| POST | `/api/sessions/login` | Público (setea la cookie `currentUser`) |
| POST | `/api/sessions/logout` | Autenticado |
| GET | `/api/sessions/current` | Autenticado |
| GET | `/api/events` | Público (con filtros, orden y paginación) |
| GET | `/api/events/:id` | Público |
| POST | `/api/events` | `organizer`, `admin` |
| PUT | `/api/events/:id` | Dueño o `admin` |
| PATCH | `/api/events/:id/status` | Dueño o `admin` |
| POST | `/api/events/:eid/tickets` | Autenticado |
| GET | `/api/events/:eid/tickets` | Dueño del evento o `admin` |
| GET | `/api/tickets/my-tickets` | Autenticado |
| PATCH | `/api/tickets/:tid/cancel` | Dueño del ticket o `admin` |
| GET | `/api/categories` | Autenticado |
| POST / PATCH | `/api/categories`, `/api/categories/:id` | `admin` |
| GET | `/api/users` | `admin` |
| PATCH | `/api/users/:uid/role` | `admin` |

## Evidencia

Las capturas de Postman están en `src/evidencia`.