// src/middlewares/eventOwnership.middleware.js
export const checkEventOwnership = (eventsDAO) => async (req, res, next) => {
    try {
        const event = await eventsDAO.getById(req.params.id);

        if (!event) {
            return res.status(404).json({ status: 'error', message: 'Evento no encontrado' });
        }

        const isAdmin = req.user.role === 'admin';
        const isOwner = event.organizer?.toString() === req.user._id.toString();

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                status: 'error',
                message: 'No tenés permisos para modificar este evento'
            });
        }

        req.event = event;
        next();
    } catch (error) {
        next(error); 
    }
};