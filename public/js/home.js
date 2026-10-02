// public/js/home.js
import { el, formatDate, formatTime, fetchJson } from './utils.js';

const DEFAULT_COLOR = '#d71920';

const loadDisciplines = async () => {
    const container = document.getElementById('disciplinas');
    try {
        const { payload } = await fetchJson('/api/categories');
        container.replaceChildren();

        if (!payload.length) {
            container.append(el('p', 'muted', 'Todavía no hay disciplinas cargadas.'));
            return;
        }

        payload.forEach((category) => {
            const card = el('article', 'card discipline-card');
            card.style.setProperty('--cat', category.color || DEFAULT_COLOR);
            card.append(el('h3', null, category.name), el('p', null, category.description || ''));
            container.append(card);
        });
    } catch (error) {
        container.replaceChildren(el('p', 'muted', `No se pudieron cargar las disciplinas: ${error.message}`));
    }
};

const buildClassRow = (event) => {
    const row = el('article', 'class-row');
    row.style.setProperty('--cat', event.category?.color || DEFAULT_COLOR);

    const when = el('div', 'class-when');
    when.append(el('strong', null, formatTime(event.date)), el('span', null, formatDate(event.date)));

    const info = el('div', 'class-info');
    info.append(
        el('h3', null, event.title),
        el('p', null, `${event.category?.name ?? 'Sin categoría'} · ${event.location}`)
    );

    const meta = el('div', 'class-meta');
    meta.append(el('span', 'badge', `Cupo ${event.capacity}`));
    if (event.price > 0) meta.append(el('span', 'badge', `$${event.price}`));

    row.append(when, info, meta);
    return row;
};

const loadUpcoming = async () => {
    const container = document.getElementById('proximasClases');
    try {
        const params = new URLSearchParams({
            status: 'published',
            dateFrom: new Date().toISOString(),   // solo clases que todavía no empezaron
            sort: 'date',
            limit: '4'
        });
        const { data } = await fetchJson(`/api/events?${params}`);
        container.replaceChildren();

        if (!data.length) {
            container.append(el('p', 'muted', 'No hay clases programadas por el momento.'));
            return;
        }
        data.forEach((event) => container.append(buildClassRow(event)));
    } catch (error) {
        container.replaceChildren(el('p', 'muted', `No se pudieron cargar las clases: ${error.message}`));
    }
};

loadDisciplines();
loadUpcoming();