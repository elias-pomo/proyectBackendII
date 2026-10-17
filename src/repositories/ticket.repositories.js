export class TicketRepository {
    constructor(dao) {
        this.dao = dao;
    }

    async create(data, session) {
        return await this.dao.create(data, session);
    }

    async findById(id) {
        return await this.dao.findById(id);
    }

    async findByIdWithRelations(id) {
        return await this.dao.findByIdWithRefs(id);
    }

    async findActiveByUserAndEvent(userId, eventId, session) {
        return await this.dao.findActiveByUserAndEvent(userId, eventId, session);
    }

    async countActiveSeats(eventId, session) {
        return await this.dao.countActiveSeats(eventId, session);
    }

    async countActiveSeatsByEvents(eventIds) {
        if (eventIds.length === 0) return new Map();
        return await this.dao.countActiveSeatsByEvents(eventIds);
    }

    async findByUser(userId) {
        return await this.dao.findByUser(userId);
    }

    async findByEvent(eventId) {
        return await this.dao.findByEvent(eventId);
    }

    // Devuelve null si el ticket ya estaba cancelado (otro pedido lo canceló primero)
    async cancelTicket(id) {
        return await this.dao.cancel(id);
    }
}