// public/js/reservas.js · mis reservas: próximas e historial, con cancelación
import {
    el, link, fetchJson, api, formatShortDate, formatTime, confirmDialog,
    showToast, emptyState, errorState, ACTIVE_TICKET
} from './utils.js';

const list = document.getElementById('lista');
const tabs = { proximas: document.getElementById('tab-proximas'), historial: document.getElementById('tab-historial') };
let tickets = [];
let current = 'proximas';

const isUpcoming = (ticket) =>
    ACTIVE_TICKET.includes(ticket.status) && ticket.event && new Date(ticket.event.date) > new Date();

const STATUS_TAG = { confirmed: ['Confirmada', 'tag tag-red'], pending: ['Pendiente', 'tag'], cancelled: ['Cancelada', 'tag tag-off'] };

const cancel = async (ticket) => {
    const ok = await confirmDialog({
        eyebrow: 'Cancelar reserva',
        title: '¿LIBERÁS TU LUGAR?',
        text: `${ticket.event.title} · ${formatShortDate(ticket.event.date)} a las ${formatTime(ticket.event.date)}. Podés volver a reservar mientras haya cupo.`,
        confirmLabel: 'Sí, cancelar',
        cancelLabel: 'Mantener'
    });
    if (!ok) return;
    try {
        await api('PATCH', `/api/tickets/${ticket._id}/cancel`);
        showToast('Reserva cancelada. Liberaste tu lugar.');
        await load();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

const buildRow = (ticket) => {
    const event = ticket.event ?? {};
    const off = !isUpcoming(ticket);
    const row = el('article', `booking ${off ? 'is-off' : ''}`);

    const when = el('div');
    when.append(el('div', `label ${off ? '' : 'label-red'}`, event.date ? formatShortDate(event.date) : '—'),
        el('div', 'class-time', event.date ? formatTime(event.date) : '--:--'));

    const main = el('div');
    const title = el('h2', 'class-title');
    title.style.margin = '0 0 6px';
    title.append(event._id ? link(`/clases/${event._id}`, null, event.title) : el('span', null, 'Clase eliminada'));
    const places = ticket.quantity === 1 ? '1 lugar' : `${ticket.quantity} lugares`;
    const detail = ticket.status === 'cancelled' && ticket.cancelledAt
        ? `Cancelada el ${formatShortDate(ticket.cancelledAt).toLowerCase()} · ${places}`
        : `${event.location ?? ''} · ${places}`;
    main.append(title, el('div', 'class-meta', detail));

    const code = el('div', 'booking-code');
    code.append(el('div', 'label', 'Código'), el('div', 'code', ticket.reservationCode));

    const actions = el('div', 'booking-actions');
    const [tagText, tagClass] = STATUS_TAG[ticket.status] ?? [ticket.status, 'tag'];
    actions.append(el('span', tagClass, tagText));
    if (isUpcoming(ticket)) {
        const button = el('button', 'btn-ghost danger', 'Cancelar');
        button.type = 'button';
        button.setAttribute('aria-label', `Cancelar la reserva de ${event.title}`);
        button.addEventListener('click', () => cancel(ticket));
        actions.append(button);
    } else if (ticket.status === 'cancelled') {
        actions.append(link('/clases', 'btn-text', 'Reservar otra'));
    }

    row.append(when, main, code, actions);
    return row;
};

const render = () => {
    const upcoming = tickets.filter(isUpcoming).sort((a, b) => new Date(a.event.date) - new Date(b.event.date));
    const history = tickets.filter((t) => !isUpcoming(t));
    tabs.proximas.textContent = `Próximas · ${upcoming.length}`;
    tabs.historial.textContent = `Historial · ${history.length}`;
    Object.entries(tabs).forEach(([key, tab]) => tab.setAttribute('aria-selected', String(key === current)));

    const items = current === 'proximas' ? upcoming : history;
    list.replaceChildren();
    if (!items.length) {
        list.append(current === 'proximas'
            ? emptyState({ title: 'Todavía no reservaste', text: 'Elegí una clase de la cartelera y guardá tu lugar.', href: '/clases', action: 'Ver clases' })
            : emptyState({ title: 'Sin historial', text: 'Acá vas a ver las clases que ya pasaron o cancelaste.' }));
        return;
    }
    const rows = el('div', 'stagger');
    items.forEach((ticket) => rows.append(buildRow(ticket)));
    list.append(rows);
};

const load = async () => {
    list.setAttribute('aria-busy', 'true');
    try {
        const { payload } = await fetchJson('/api/tickets/my-tickets');
        tickets = payload;
        render();
    } catch (error) {
        list.replaceChildren(errorState(error.message));
    } finally {
        list.setAttribute('aria-busy', 'false');
    }
};

Object.entries(tabs).forEach(([key, tab]) => tab.addEventListener('click', () => {
    current = key;
    render();
}));

// Flechas izquierda/derecha entre pestañas, como pide el patrón de tabs
document.querySelector('.tabs').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    current = current === 'proximas' ? 'historial' : 'proximas';
    render();
    tabs[current].focus();
});

load();
