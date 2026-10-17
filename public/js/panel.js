// public/js/panel.js · panel del organizer (y del admin): clases, estados, inscriptos y formulario
import {
    el, fetchJson, api, formatShortDate, formatTime, currentUser, confirmDialog,
    showToast, errorState, meter, toLocalInput
} from './utils.js';

const user = currentUser();
const table = document.getElementById('tablaClases');
const enrolled = document.getElementById('inscriptos');
const form = document.getElementById('formClase');
const formError = document.getElementById('formError');
const btnPublish = document.getElementById('btnPublicar');
const btnDraft = document.getElementById('btnBorrador');
const btnCancelEdit = document.getElementById('btnCancelarEdicion');

let events = [];
let seats = new Map();       // eventId → summary { capacity, taken, available }
let editing = null;          // evento que se está editando
let selectedId = null;       // evento cuyos inscriptos se muestran

const STATUS_TAG = {
    published: ['Publicada', 'tag tag-red'],
    draft: ['Borrador', 'tag tag-draft'],
    cancelled: ['Cancelada', 'tag tag-off'],
    finished: ['Finalizada', 'tag tag-off']
};

// La API pagina de a 50 como máximo: se piden todas las páginas
const fetchAllEvents = async () => {
    const all = [];
    for (let page = 1; ; page++) {
        const result = await fetchJson(`/api/events?sort=date&limit=50&page=${page}`);
        all.push(...result.data);
        if (page >= result.totalPages) break;
    }
    // El organizer ve también las clases publicadas de otros profes: acá solo van las suyas
    return user.role === 'admin' ? all : all.filter((event) => (event.organizer?._id ?? event.organizer) === user._id);
};

const loadSeats = async (list) => {
    const withTickets = list.filter((event) => ['published', 'finished'].includes(event.status));
    const results = await Promise.allSettled(withTickets.map((event) => fetchJson(`/api/events/${event._id}/tickets`)));
    seats = new Map();
    results.forEach((result, i) => {
        if (result.status === 'fulfilled') seats.set(withTickets[i]._id, result.value.summary);
    });
};

const renderStats = () => {
    const now = Date.now();
    const week = now + 7 * 24 * 60 * 60 * 1000;
    const values = {
        published: events.filter((e) => e.status === 'published').length,
        draft: events.filter((e) => e.status === 'draft').length,
        week: events.filter((e) => e.status === 'published' && new Date(e.date) > now && new Date(e.date) < week).length
    };
    document.querySelectorAll('[data-stat]').forEach((node) => { node.textContent = String(values[node.dataset.stat]); });
};

const actionButton = (text, className, onClick, label) => {
    const button = el('button', className, text);
    button.type = 'button';
    if (label) button.setAttribute('aria-label', label);
    button.addEventListener('click', onClick);
    return button;
};

const changeStatus = async (event, status, { title, text, confirmLabel }) => {
    const ok = await confirmDialog({ eyebrow: event.title, title, text, confirmLabel });
    if (!ok) return;
    try {
        await api('PATCH', `/api/events/${event._id}/status`, { status });
        showToast(status === 'published' ? 'Clase publicada.' : status === 'cancelled' ? 'Clase cancelada.' : 'Clase finalizada.');
        await load();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

const buildRow = (event) => {
    const row = el('tr');
    if (['cancelled', 'finished'].includes(event.status)) row.classList.add('is-off');
    if (event._id === selectedId) row.classList.add('is-selected');

    const name = el('td');
    name.append(el('div', 't-title', event.title), el('div', 't-sub', `${event.category?.name ?? ''} · ${event.location}`));
    if (user.role === 'admin' && event.organizer?.first_name) {
        name.append(el('div', 't-sub', `Profe: ${event.organizer.first_name} ${event.organizer.last_name ?? ''}`));
    }

    const date = el('td', null, `${formatShortDate(event.date)} · ${formatTime(event.date)}`);

    const capacity = el('td');
    const summary = seats.get(event._id);
    if (summary) {
        const count = el('div', 'cond', `${summary.taken} / ${summary.capacity}`);
        count.style.fontWeight = '600';
        const bar = meter(summary.taken / summary.capacity);
        bar.style.width = '80px';
        bar.style.marginTop = '8px';
        capacity.append(count, bar);
    } else {
        capacity.append(el('div', 'cond', `– / ${event.capacity}`));
    }

    const [tagText, tagClass] = STATUS_TAG[event.status] ?? [event.status, 'tag'];
    const status = el('td');
    status.append(el('span', tagClass, tagText));

    const actions = el('td', 't-actions');
    if (['published', 'finished'].includes(event.status)) {
        actions.append(actionButton('Inscriptos', 'btn-text red', () => showEnrolled(event), `Ver inscriptos de ${event.title}`));
    }
    if (event.status === 'draft') {
        actions.append(actionButton('Publicar', 'btn-text red', () => changeStatus(event, 'published', {
            title: '¿PUBLICÁS LA CLASE?',
            text: 'Va a aparecer en la cartelera y los alumnos van a poder reservar.',
            confirmLabel: 'Publicar'
        }), `Publicar ${event.title}`));
    }
    if (event.status !== 'cancelled') {
        actions.append(actionButton('Editar', 'btn-text', () => startEdit(event), `Editar ${event.title}`));
    }
    if (['draft', 'published'].includes(event.status)) {
        actions.append(actionButton('Cancelar', 'btn-text', () => changeStatus(event, 'cancelled', {
            title: '¿CANCELÁS LA CLASE?',
            text: 'Es definitivo: una clase cancelada no se puede volver a publicar ni editar.',
            confirmLabel: 'Sí, cancelar'
        }), `Cancelar ${event.title}`));
    }
    if (!actions.children.length) actions.append(el('span', 'muted', 'Sin acciones'));

    row.append(name, date, capacity, status, actions);
    return row;
};

const renderTable = () => {
    table.replaceChildren();
    if (!events.length) {
        const row = el('tr');
        const cell = el('td');
        cell.colSpan = 5;
        cell.append(el('p', 'muted', 'Todavía no creaste clases. Armá la primera con el formulario.'));
        row.append(cell);
        table.append(row);
        return;
    }
    events.forEach((event) => table.append(buildRow(event)));
};

const showEnrolled = async (event) => {
    selectedId = event._id;
    renderTable();
    enrolled.hidden = false;
    enrolled.replaceChildren(el('div', 'skeleton'));
    try {
        const { payload, summary } = await fetchJson(`/api/events/${event._id}/tickets`);
        const head = el('div');
        head.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:baseline';
        head.append(el('h2', 'cond', `Inscriptos · ${event.title}`), el('span', 'label', `${summary.taken} ocupados · ${summary.available} libres`));
        head.firstChild.style.fontSize = '24px';
        head.firstChild.style.letterSpacing = '3px';

        // Un bloque por lugar hasta 40; con más cupo, una barra
        let visual;
        if (summary.capacity <= 40) {
            visual = el('div', 'seats');
            for (let i = 0; i < summary.capacity; i++) visual.append(el('span', i < summary.taken ? 'on' : ''));
        } else {
            visual = meter(summary.taken / summary.capacity);
        }
        visual.style.margin = '20px 0 24px';
        visual.setAttribute('aria-hidden', 'true');

        const people = el('ul');
        people.style.cssText = 'list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));column-gap:48px';
        if (!payload.length) people.append(el('li', 'muted', 'Todavía no hay inscriptos.'));
        payload.forEach((ticket) => {
            const item = el('li');
            item.style.cssText = 'display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--linea-suave);padding:14px 0;font-weight:300';
            const fullName = `${ticket.user?.first_name ?? ''} ${ticket.user?.last_name ?? ''}`.trim() || ticket.user?.email || 'Alumno';
            const who = el('span', null, fullName);
            const meta = el('span', 'label', ticket.status === 'cancelled' ? 'Cancelada' : `${ticket.quantity} · ${ticket.reservationCode}`);
            if (ticket.status === 'cancelled') {
                item.style.color = 'var(--apagado)';
                who.style.textDecoration = 'line-through';
            }
            meta.style.letterSpacing = '2px';
            item.append(who, meta);
            people.append(item);
        });

        enrolled.replaceChildren(head, visual, people);
        enrolled.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
        enrolled.replaceChildren(errorState(error.message));
    }
};

// ---------- Formulario: crear y editar ----------
const setMode = (event) => {
    editing = event;
    document.getElementById('formModo').textContent = event ? 'Editar clase' : 'Nueva clase';
    document.getElementById('formTitulo').textContent = event ? event.title.toUpperCase() : 'ARMÁ LA CARTELERA';
    btnCancelEdit.hidden = !event;
    // Una clase ya publicada se edita sin cambiar su estado
    btnDraft.hidden = Boolean(event && event.status !== 'draft');
    btnPublish.textContent = event ? (event.status === 'draft' ? 'Guardar y publicar' : 'Guardar cambios') : 'Publicar';
    formError.textContent = '';
};

const startEdit = (event) => {
    setMode(event);
    form.elements.title.value = event.title;
    form.elements.category.value = event.category?.name ?? '';
    form.elements.date.value = toLocalInput(event.date);
    form.elements.endDate.value = toLocalInput(event.endDate);
    form.elements.capacity.value = event.capacity;
    form.elements.price.value = event.price;
    form.elements.location.value = event.location;
    form.elements.description.value = event.description;
    document.getElementById('form-clase').scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.elements.title.focus({ preventScroll: true });
};

const resetForm = () => {
    form.reset();
    setMode(null);
};

const readForm = () => {
    const f = form.elements;
    return {
        title: f.title.value.trim(),
        category: f.category.value,
        date: f.date.value ? new Date(f.date.value).toISOString() : undefined,
        endDate: f.endDate.value ? new Date(f.endDate.value).toISOString() : undefined,
        capacity: f.capacity.value,
        price: f.price.value === '' ? 0 : f.price.value,
        location: f.location.value.trim(),
        description: f.description.value.trim()
    };
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';
    if (!form.checkValidity()) {
        const invalid = form.querySelector(':invalid');
        formError.textContent = 'Revisá los campos: todos son obligatorios (título de 3 letras, descripción de 10).';
        invalid?.focus();
        return;
    }

    const status = e.submitter?.dataset.status ?? 'published';
    const data = readForm();
    const button = e.submitter;
    button.disabled = true;

    try {
        if (editing) {
            await api('PUT', `/api/events/${editing._id}`, data);
            if (editing.status === 'draft' && status === 'published') {
                await api('PATCH', `/api/events/${editing._id}/status`, { status: 'published' });
            }
            showToast('Cambios guardados.');
        } else {
            await api('POST', '/api/events', { ...data, status });
            showToast(status === 'published' ? 'Clase publicada en la cartelera.' : 'Borrador guardado.');
        }
        resetForm();
        await load();
    } catch (error) {
        formError.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

btnCancelEdit.addEventListener('click', resetForm);
document.getElementById('btnNueva').addEventListener('click', () => {
    resetForm();
    setTimeout(() => form.elements.title.focus(), 300);
});

const fillCategories = async () => {
    const select = form.elements.category;
    try {
        const { payload } = await fetchJson('/api/categories');
        payload.forEach((category) => {
            const option = el('option', null, category.name);
            option.value = category.name;
            select.append(option);
        });
    } catch {
        select.append(el('option', null, 'No se pudieron cargar las disciplinas'));
    }
};

const load = async () => {
    try {
        events = await fetchAllEvents();
        await loadSeats(events);
        renderStats();
        renderTable();
        if (selectedId) {
            const selected = events.find((event) => event._id === selectedId);
            if (selected) showEnrolled(selected);
        }
    } catch (error) {
        table.replaceChildren();
        const row = el('tr');
        const cell = el('td');
        cell.colSpan = 5;
        cell.append(errorState(error.message));
        row.append(cell);
        table.append(row);
    }
};

// Valores por defecto razonables para una clase nueva: la semana que viene a las 19
const defaults = () => {
    const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    start.setHours(19, 0, 0, 0);
    form.elements.date.value = toLocalInput(start);
    form.elements.endDate.value = toLocalInput(new Date(start.getTime() + 60 * 60 * 1000));
    form.elements.capacity.value = 10;
};
form.addEventListener('reset', () => setTimeout(defaults));

await fillCategories();
defaults();
load();
