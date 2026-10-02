export class TicketsController {
    constructor(ticketsService) {
        this.ticketsService = ticketsService;
    }

    createTicket = async (req, res, next) => {
        try {
            const ticket = await this.ticketsService.createTicket(req.params.eid, req.body, req.user);
            return res.status(201).json({ status: 'success', payload: ticket });
        } catch (error) {
            next(error);
        }
    }

    getMyTickets = async (req, res, next) => {
        try {
            const tickets = await this.ticketsService.getMyTickets(req.user);
            return res.status(200).json({ status: 'success', payload: tickets });
        } catch (error) {
            next(error);
        }
    }

    getEventTickets = async (req, res, next) => {
        try {
            const { tickets, summary } = await this.ticketsService.getEventTickets(req.params.eid, req.user);
            return res.status(200).json({ status: 'success', payload: tickets, summary });
        } catch (error) {
            next(error);
        }
    }

    cancelTicket = async (req, res, next) => {
        try {
            const ticket = await this.ticketsService.cancelTicket(req.params.tid, req.user);
            return res.status(200).json({ status: 'success', payload: ticket });
        } catch (error) {
            next(error);
        }
    }
}