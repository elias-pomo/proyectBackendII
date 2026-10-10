import { EVENT_STATUSES } from '../constants/statuses.js';

export class EventRepository {
    constructor(dao) {
        this.dao = dao;
    }

    async findPaginated(filter, options) {
        return await this.dao.paginate(filter, options);
    }

    async findPublishedEvents(filter, options) {
        const published = EVENT_STATUSES[1];   // 'published'
        return await this.dao.paginate({ ...filter, status: published }, options);
    }

    async findById(id) {
        return await this.dao.findById(id);
    }

    async findByIdWithRelations(id) {
        return await this.dao.findByIdPopulated(id);
    }

    async create(data) {
        return await this.dao.create(data);
    }

    async update(id, data) {
        return await this.dao.update(id, data);
    }

    async lockForBooking(id, session) {
        return await this.dao.lockForBooking(id, session);
    }
}