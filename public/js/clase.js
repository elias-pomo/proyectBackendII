// public/js/clase.js · detalle de una clase e inscripción
import {
    el, link, fetchJson, api, formatDate, formatTime, formatPrice, currentUser,
    emptyState, showToast, ACTIVE_TICKET
} from './utils.js';

const root = document.getElementById('detalle');
const info = document.getElementById('info');
const box = document.getElementById('reserva');
const eventId = root.dataset.eventId;
const user = currentUser();

const STATUS_MESSAGES = {
    draft: 'Esta clase todavía no está publicada.',
    cancelled: 'Esta clase fue cancelada.',
    finished: 'Esta clase ya terminó.'
};

const fact = (label, value, big = false) => {
    const cell = el('div');
    cell.append(el('div', 'label', label), el('div', `value ${big ? 'big' : ''}`, value));
    return cell;
};

const renderInfo = (event) => {
    const title = el('h1', 'display display-xl', event.title);
    const facts = el('div', 'facts');
    facts.append(
        fact('Horario', `${formatTime(event.date)} – ${formatTime(event.endDate)}`, true),
        fact('Lugar', event.location),
        fact('Precio', formatPrice(event.price))
    );
    const organizer = event.organizer?.first_name
        ? `Profe: ${event.organizer.first_name} ${event.organizer.last_name ?? ''}`.trim()
        : null;

    info.replaceChildren(
        el('div', 'eyebrow label-red', `${event.category?.name ?? 'Clase'} · ${formatDate(event.date)}`),
        title,
        facts,
        el('p', 'description', event.description)
    );
    if (organizer) info.append(el('p', 'muted', `${organizer} · Código ${event.code}`));
    document.title = `${event.title} | Box Club Tucumán`;
};

const availableSeats = (event) => event.available ?? event.capacity;

// "QUEDAN 4", con el número en rojo
const capacityHeading = (event) => {
    const heading = el('div', 'display display-md', 'QUEDAN ');
    heading.append(el('span', 'accent', String(availableSeats(event))));
    return heading;
};

const renderBooked = (ticket) => {
    const wrap = el('div', 'booking-box');
    const code = el('div', 'reservation-code');
    code.append(el('div', 'label', 'Código de reserva'), el('div', 'display', ticket.reservationCode));
    const heading = el('div', 'display display-md');
    heading.append('ESTÁS', el('br'), 'ADENTRO.');
    const places = ticket.quantity === 1 ? '1 lugar reservado.' : `${ticket.quantity} lugares reservados.`;
    wrap.append(
        el('div', 'label label-red', 'Reserva confirmada'),
        heading,
        code,
        el('p', 'muted', `${places} Te mandamos la confirmación por mail.`),
        link('/mis-reservas', 'btn-ghost', 'Ver mis reservas')
    );
    box.replaceChildren(wrap);
};

const renderClosed = (text) => {
    box.replaceChildren(emptyState({ eyebrow: 'Sin reservas', title: 'Cerrada', text, href: '/clases', action: 'Ver otras clases' }));
    box.firstChild.style.borderTop = '0';
    box.firstChild.style.paddingTop = '0';
};

const renderLogin = (event) => {
    const wrap = el('div', 'booking-box');
    wrap.append(
        el('div', 'label', 'Reservá tu lugar'),
        capacityHeading(event),
        el('p', 'muted', 'Ingresá con tu cuenta para reservar. Si no tenés, la creás en un minuto.'),
        link(`/login?next=${encodeURIComponent(location.pathname)}`, 'btn btn-lg btn-block', 'Ingresar para reservar'),
        link('/registro', 'btn-text', 'Crear cuenta')
    );
    box.replaceChildren(wrap);
};

const renderForm = (event) => {
    // Tope: el límite por inscripción de la disciplina (si tiene) y nunca más que los lugares libres
    const available = availableSeats(event);
    const max = Math.min(event.category?.maxQuantityPerTicket ?? available, available, 10);
    let quantity = 1;

    const wrap = el('div', 'booking-box');
    const capacity = capacityHeading(event);

    const stepperLabel = el('div', 'label', 'Lugares a reservar');
    stepperLabel.id = 'qty-label';
    const stepper = el('div', 'stepper');
    stepper.setAttribute('role', 'group');
    stepper.setAttribute('aria-labelledby', 'qty-label');
    const minus = el('button', null, '−');
    const plus = el('button', null, '+');
    const output = el('output', null, '1');
    minus.type = plus.type = 'button';
    minus.setAttribute('aria-label', 'Restar un lugar');
    plus.setAttribute('aria-label', 'Sumar un lugar');
    output.setAttribute('aria-live', 'polite');
    const update = () => {
        output.textContent = String(quantity);
        minus.disabled = quantity <= 1;
        plus.disabled = quantity >= max;
    };
    minus.addEventListener('click', () => { quantity = Math.max(1, quantity - 1); update(); });
    plus.addEventListener('click', () => { quantity = Math.min(max, quantity + 1); update(); });
    stepper.append(minus, output, plus);
    update();

    const alert = el('div', 'alert');
    alert.setAttribute('role', 'alert');
    const submit = el('button', 'btn btn-lg btn-block', 'Reservar lugar');
    submit.type = 'button';
    submit.addEventListener('click', async () => {
        alert.textContent = '';
        submit.disabled = true;
        submit.setAttribute('aria-busy', 'true');
        try {
            const { payload } = await api('POST', `/api/events/${event._id}/tickets`, { quantity });
            showToast(`Reserva confirmada: ${payload.reservationCode}`);
            renderBooked(payload);
        } catch (error) {
            alert.textContent = error.message;   // 409 sin cupo, duplicado, clase cerrada…
            submit.disabled = false;
            submit.removeAttribute('aria-busy');
        }
    });

    const hint = event.category?.maxQuantityPerTicket === 1 && available > 1
        ? `${event.category.name} permite reservar un lugar por inscripción.`
        : 'Te mandamos el código por mail. Podés cancelar hasta que empiece la clase.';

    wrap.append(el('div', 'label', 'Reservá tu lugar'), capacity);
    if (max > 1) {
        const group = el('div');
        group.append(stepperLabel, stepper);
        stepperLabel.style.marginBottom = '12px';
        wrap.append(group);
    }
    wrap.append(alert, submit, el('p', 'muted', hint));
    box.replaceChildren(wrap);
};

const findMyTicket = async () => {
    if (!user) return null;
    try {
        const { payload } = await fetchJson('/api/tickets/my-tickets');
        return payload.find((ticket) =>
            (ticket.event?._id ?? ticket.event) === eventId && ACTIVE_TICKET.includes(ticket.status)) ?? null;
    } catch {
        return null;
    }
};

try {
    const [{ payload: event }, ticket] = await Promise.all([fetchJson(`/api/events/${eventId}`), findMyTicket()]);
    renderInfo(event);

    if (ticket) renderBooked(ticket);
    else if (STATUS_MESSAGES[event.status]) renderClosed(STATUS_MESSAGES[event.status]);
    else if (new Date(event.date) <= new Date()) renderClosed('La clase ya empezó, no admite reservas.');
    else if (event.available === 0) renderClosed('No quedan lugares en esta clase.');
    else if (!user) renderLogin(event);
    else renderForm(event);
} catch (error) {
    const notFound = error.status === 404 || error.status === 400;
    info.replaceChildren(emptyState({
        eyebrow: notFound ? 'Error 404' : 'No pudimos cargar la clase',
        title: notFound ? 'Esta clase no existe' : 'Algo falló',
        text: notFound ? 'Puede que la hayan sacado de la cartelera.' : error.message,
        href: '/clases',
        action: 'Ver la cartelera'
    }));
    box.remove();
}
