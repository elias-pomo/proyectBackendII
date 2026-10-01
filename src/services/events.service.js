// src/services/events.service.js
import { AppError } from '../utils/AppError.js';
import { EVENT_STATUSES } from '../dao/models/event.model.js';

const SORTABLE_FIELDS = ['date', 'price', 'capacity', 'title', 'createdAt'];
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const TZ_OFFSET = '-03:00'; 
const EDITABLE_FIELDS = ['code', 'title', 'description', 'price', 'capacity', 'category', 'date', 'endDate', 'location'];

const ALLOWED_TRANSITIONS = {
    draft: ['published', 'cancelled'],
    published: ['cancelled', 'finished'],
    cancelled: [],
    finished: []
};

const toNumber = (value) =>
    typeof value === 'number' ? value
    : typeof value === 'string' && value.trim() !== '' ? Number(value)
    : NaN;

const parseCapacity = (value) => {
    const n = toNumber(value);
    if (!Number.isInteger(n) || n <= 0) throw new AppError('capacity debe ser un número entero mayor a 0', 400);
    return n;
};

const parsePrice = (value) => {
    const n = toNumber(value);
    if (!Number.isFinite(n) || n < 0) throw new AppError('price debe ser un número mayor o igual a 0', 400);
    return n;
};
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseDate = (value, field, { endOfDay = false } = {}) => {
    if (typeof value !== 'string') throw new AppError(`${field} no es una fecha válida`, 400);
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const raw = isDateOnly ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}${TZ_OFFSET}` : value;
    const date = new Date(raw);
    if (isNaN(date)) throw new AppError(`${field} no es una fecha válida`, 400);
    return date;
};

const parseIntParam = (value, field, fallback, max = Infinity) => {
    if (value === undefined) return fallback;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > max) {
        throw new AppError(
            max === Infinity ? `${field} debe ser un entero mayor o igual a 1` : `${field} debe ser un entero entre 1 y ${max}`,
            400
        );
    }
    return n;
};

const isOwner = (user, event) =>
    Boolean(user) && String(event.organizer?._id ?? event.organizer) === String(user._id);

const visibilityFilter = (user) => {
    if (user?.role === 'admin') return {};
    if (user?.role === 'organizer') return { $or: [{ status: { $ne: 'draft' } }, { organizer: user._id }] };
    return { status: { $ne: 'draft' } };
};

export class EventsService {
    constructor(eventsDAO, categoriesDAO) {
        this.eventsDAO = eventsDAO;
        this.categoriesDAO = categoriesDAO;
    }

    async getEvents(query = {}, user = null) {
        const { status, category, location, dateFrom, dateTo, sort = 'date' } = query;

        const page = parseIntParam(query.page, 'page', 1);
        const limit = parseIntParam(query.limit, 'limit', DEFAULT_LIMIT, MAX_LIMIT);

        const sortField = typeof sort === 'string' ? sort.replace(/^-/, '') : null;
        if (!SORTABLE_FIELDS.includes(sortField)) {
            throw new AppError(`sort inválido. Campos permitidos: ${SORTABLE_FIELDS.join(', ')} (con "-" adelante para orden descendente)`, 400);
        }
        const sortDir = sort.startsWith('-') ? -1 : 1;

        const filter = {};

        if (status !== undefined) {
            if (!EVENT_STATUSES.includes(status)) {
                throw new AppError(`status inválido. Valores permitidos: ${EVENT_STATUSES.join(', ')}`, 400);
            }
            filter.status = status;
        }

        if (category !== undefined) {
            const categoryFound = typeof category === 'string' ? await this.categoriesDAO.getByName(category.trim()) : null;
            if (!categoryFound) {
                return { data: [], page, limit, total: 0, totalPages: 0 };  
            }
            filter.category = categoryFound._id;
        }

        if (location !== undefined) {
            if (typeof location !== 'string' || !location.trim()) throw new AppError('location no es válido', 400);
            filter.location = { $regex: escapeRegex(location.trim()), $options: 'i' };
        }

        if (dateFrom !== undefined || dateTo !== undefined) {
            filter.date = {};
            if (dateFrom !== undefined) filter.date.$gte = parseDate(dateFrom, 'dateFrom');
            if (dateTo !== undefined) filter.date.$lte = parseDate(dateTo, 'dateTo', { endOfDay: true });
        }

        const { data, total } = await this.eventsDAO.paginate(
            { $and: [filter, visibilityFilter(user)] },
            { sortField, sortDir, page, limit }
        );

        return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
    }

    async getEventById(id, user = null) {
        const event = await this.eventsDAO.getByIdPopulated(id); 

        const visible = event && (event.status !== 'draft' || user?.role === 'admin' || isOwner(user, event));
        if (!visible) throw new AppError('Evento no encontrado', 404);

        return event;
    }

    async resolveCategory(name) {
    if (typeof name !== 'string' || !name.trim()) throw new AppError('La categoría es obligatoria', 400);
    const category = await this.categoriesDAO.getByName(name.trim());
    if (!category) throw new AppError('Categoría inexistente', 400);
    return category;
}

// 404 si no existe, 403 si no es el dueño ni admin
async findManageableEvent(id, user) {
    const event = await this.eventsDAO.getById(id);   // id mal formado: CastError (400)
    if (!event) throw new AppError('Evento no encontrado', 404);
    if (user.role !== 'admin' && !isOwner(user, event)) {
        throw new AppError('No tenés permisos para modificar este evento', 403);
    }
    return event;
}

async createEvent(body, user) {
    const { code, title, description, price, capacity, category, date, endDate, location, status = 'draft' } = body ?? {};

    if (!['draft', 'published'].includes(status)) {
        throw new AppError('Un evento solo puede crearse como draft o published', 400);
    }

    const eventDate = parseDate(date, 'date');
    const eventEnd = parseDate(endDate, 'endDate');
    if (eventDate <= new Date()) throw new AppError('No se puede crear un evento con fecha pasada', 400);
    if (eventEnd <= eventDate) throw new AppError('endDate debe ser posterior a date', 400);

    const eventCapacity = parseCapacity(capacity);
    const eventPrice = price === undefined ? 0 : parsePrice(price);
    const categoryFound = await this.resolveCategory(category);

    return await this.eventsDAO.create({
        code: typeof code === 'string' && code.trim() ? code.trim() : `CLS-${Date.now().toString(36).toUpperCase()}`,
        title, description, location, status,
        price: eventPrice,
        capacity: eventCapacity,
        date: eventDate,
        endDate: eventEnd,
        category: categoryFound._id,
        organizer: user._id      // siempre desde la sesión, nunca desde el body
    });
}

async updateEvent(id, body, user) {
    const event = await this.findManageableEvent(id, user);

    if (event.status === 'cancelled') {
        throw new AppError('Un evento cancelado no puede modificarse', 409);
    }

    const data = Object.fromEntries(
        Object.entries(body ?? {}).filter(([key]) => EDITABLE_FIELDS.includes(key))
    );
    if (Object.keys(data).length === 0) {
        throw new AppError('No hay campos válidos para actualizar', 400);
    }

    for (const field of ['code', 'title', 'description', 'location']) {
        if (data[field] !== undefined && typeof data[field] !== 'string') {
            throw new AppError(`${field} debe ser un texto`, 400);
        }
    }
    if (data.capacity !== undefined) data.capacity = parseCapacity(data.capacity);
    if (data.price !== undefined) data.price = parsePrice(data.price);
    if (data.category !== undefined) data.category = (await this.resolveCategory(data.category))._id;

    if (data.date !== undefined) {
        data.date = parseDate(data.date, 'date');
        const changed = data.date.getTime() !== event.date.getTime();
        if (changed && data.date <= new Date()) {
            throw new AppError('No se puede reprogramar un evento a una fecha pasada', 400);
        }
    }
    if (data.endDate !== undefined) data.endDate = parseDate(data.endDate, 'endDate');

    const finalDate = data.date ?? event.date;
    const finalEnd = data.endDate ?? event.endDate;
    if (finalEnd <= finalDate) throw new AppError('endDate debe ser posterior a date', 400);

    return await this.eventsDAO.update(id, data);
}

async changeStatus(id, status, user) {
    if (!EVENT_STATUSES.includes(status)) {
        throw new AppError(`status inválido. Valores permitidos: ${EVENT_STATUSES.join(', ')}`, 400);
    }

    const event = await this.findManageableEvent(id, user);

    if (event.status === 'cancelled') {
        throw new AppError('Un evento cancelado no puede cambiar de estado', 409);
    }
    if (status === 'published' && event.status === 'finished') {
        throw new AppError('No se puede publicar un evento finalizado', 409);
    }
    if (!ALLOWED_TRANSITIONS[event.status].includes(status)) {
        throw new AppError(`No se puede pasar un evento de "${event.status}" a "${status}"`, 409);
    }
    if (status === 'published' && event.date <= new Date()) {
        throw new AppError('No se puede publicar un evento cuya fecha ya pasó', 409);
    }

    return await this.eventsDAO.update(id, { status });
}

}