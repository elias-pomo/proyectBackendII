# Tuc-Techno Pass - API REST

## Temática del Proyecto
**Tuc-Techno Pass** es una API REST diseñada como la plataforma base para la consulta de eventos futuros, preventa y compra de tickets para la escena de música electrónica y fiestas techno en la provincia de Tucumán, Argentina.

---

## Tecnologías Utilizadas
- **Node.js** (Entorno de ejecución)
- **Express.js** (Framework para el servidor web)
- **MongoDB & Mongoose** (Base de datos NoSQL y ODM)
- **dotenv** (Manejo de variables de entorno)

---

## Estructura del Proyecto

El proyecto sigue una arquitectura por capas para facilitar su escalabilidad y mantenimiento:

```text
├── config/         # Configuración general (base de datos, variables, etc.)
├── controllers/    # Controladores (manejo de req, res y HTTP)
├── dao/            # Data Access Objects
├── middlewares/    # Middlewares personalizados (validaciones, auth, etc.)
├── models/         # Modelos de datos / Esquemas (User, Event)
├── repositories/   # Capa de repositorios
├── routes/         # Definición de rutas y endpoints de la API
├── services/       # Lógica de negocio
├── utils/          # Funciones auxiliares y helpers
├── .env.example    # Plantilla de variables de entorno
├── .gitignore      # Archivos y carpetas excluidos de Git
├── app.js          # Configuración inicial y middlewares de Express
├── package.json    # Dependencias y scripts del proyecto
└── server.js       # Punto de entrada (levanta el servidor)
```

---

## 1_ Clonar el repositorio:

git clone https://github.com/elias-pomo/proyectBackendII
cd proyectoCursoI

---

## 2_ Instalar dependencias:

npm install

---

## 3_ Ejecucion de proyecto:
_Modo desarrollo:

npm run dev

_Modo produccion:

npm start

El servidor quedará escuchando en http://localhost:8080 (o el puerto configurado en el .env).

---

## Rutas Disponibles
General / Health Check
GET /api/health -> Devuelve el estado actual del servidor (200 OK).

Eventos (events)
GET /api/events -> Devuelve la lista de eventos techno programados en Tucumán.

Sesiones / Usuarios (sessions)
Estructura base configurada para la gestión de usuarios y autenticación en entregas posteriores.