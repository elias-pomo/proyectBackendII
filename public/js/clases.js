// public/js/clases.js · cartelera en calendario semanal (y vista lista), con filtro por disciplina
import {
    el, link, fetchJson, formatTime, formatPrice, durationMinutes,
    currentUser, loadCategories, emptyState, errorState, meter, ACTIVE_TICKET
} from './utils.js';

const TZ = 'America/Argentina/Buenos_Aires';
const HOUR_PX = 72;             // alto de una hora en la grilla
const GAP_PX = 34;              // alto de una franja de horas sin clases (compactada)
const MAX_LANES = 3;            // clases superpuestas lado a lado; el resto va a un bloque "+N"
const DEFAULT_HOURS = [7, 22];  // franja cuando no hay clases para medir
const MIN_HOURS = 6;            // la grilla nunca muestra menos de 6 horas
const DAY = 24 * 60 * 60 * 1000;

const board = document.getElementById('cartelera');
const summary = document.getElementById('resumen');
const rangeLabel = document.getElementById('rangoSemana');
const chips = document.getElementById('disciplinas');
const viewButtons = document.querySelectorAll('.cal-views button');
const mobile = window.matchMedia('(max-width: 900px)');

// ---------- Fechas en hora argentina ----------
const WEEKDAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const partsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short'
});
const arParts = (date) => {
    const p = Object.fromEntries(partsFormatter.formatToParts(new Date(date)).map(({ type, value }) => [type, value]));
    return {
        key: `${p.year}-${p.month}-${p.day}`,
        minutes: (Number(p.hour) % 24) * 60 + Number(p.minute),
        weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday)
    };
};
// Mediodía del día: así sumar o restar días nunca cruza de fecha por el huso horario
const keyToDate = (key) => new Date(`${key}T12:00:00-03:00`);
const addDays = (key, n) => arParts(keyToDate(key).getTime() + n * DAY).key;
const mondayOf = (key) => addDays(key, -arParts(keyToDate(key)).weekday);
const todayKey = () => arParts(Date.now()).key;
const dayNumber = (key) => Number(key.slice(8));
const monthName = (key) => MONTHS[Number(key.slice(5, 7)) - 1];

// ---------- Estado (se refleja en la URL para poder compartirlo) ----------
const query = new URLSearchParams(location.search);
const state = {
    week: /^\d{4}-\d{2}-\d{2}$/.test(query.get('semana') ?? '') ? mondayOf(query.get('semana')) : mondayOf(todayKey()),
    category: query.get('category') ?? '',
    view: query.get('vista') === 'lista' ? 'lista' : 'semana',
    day: null,
    events: [],
    direction: 0
};
let bookings = new Map();   // eventId → ticket activo del usuario
// Sin semana en la URL y sin clases por delante en la actual, se salta a la siguiente una sola vez
let autoAdvance = !query.get('semana');
let advancedNote = '';

const weekDays = () => Array.from({ length: 7 }, (_, i) => addDays(state.week, i));

const syncUrl = () => {
    const params = new URLSearchParams();
    if (state.week !== mondayOf(todayKey())) params.set('semana', state.week);
    if (state.category) params.set('category', state.category);
    if (state.view === 'lista') params.set('vista', 'lista');
    const qs = params.toString();
    history.replaceState(null, '', qs ? `/clases?${qs}` : '/clases');
};

// ---------- Datos ----------
const fetchWeek = async () => {
    const days = weekDays();
    const all = [];
    for (let page = 1; ; page++) {
        const params = new URLSearchParams({
            status: 'published', sort: 'date', limit: '50', page: String(page),
            dateFrom: days[0], dateTo: days[6],
            ...(state.category && { category: state.category })
        });
        const result = await fetchJson(`/api/events?${params}`);
        all.push(...result.data);
        if (page >= result.totalPages) break;
    }
    return all;
};

const loadBookings = async () => {
    if (!currentUser()) return;
    try {
        const { payload } = await fetchJson('/api/tickets/my-tickets');
        bookings = new Map(payload
            .filter((ticket) => ACTIVE_TICKET.includes(ticket.status))
            .map((ticket) => [ticket.event?._id ?? ticket.event, ticket]));
    } catch {
        bookings = new Map();
    }
};

// Estado visual de una clase: reservada, completa, ya pasó o con lugar
const statusOf = (event) => {
    if (bookings.has(event._id)) return 'booked';
    if (new Date(event.endDate) < Date.now()) return 'past';
    if (event.available === 0) return 'full';
    return 'open';
};
const availableOf = (event) => event.available ?? event.capacity;

const statusText = (event, status) => ({
    booked: 'Tu reserva',
    past: 'Terminó',
    full: 'Completa',
    open: availableOf(event) === 1 ? 'Último lugar' : `Quedan ${availableOf(event)}`
})[status];

// ---------- Vista semana (escritorio) ----------
// Reparte en columnas las clases que se superponen en el mismo día
const layoutDay = (events) => {
    const items = events
        .map((event) => {
            const start = arParts(event.date).minutes;
            return { event, start, end: Math.max(start + durationMinutes(event.date, event.endDate), start + 30) };
        })
        .sort((a, b) => a.start - b.start || b.end - a.end);

    let cluster = [];
    let clusterEnd = -1;
    let groupId = 0;
    const lanesEnd = [];
    const close = () => {
        const lanes = Math.max(...cluster.map((item) => item.lane)) + 1;
        groupId++;
        cluster.forEach((item) => { item.lanes = lanes; item.group = groupId; });
        cluster = [];
        lanesEnd.length = 0;
    };
    items.forEach((item) => {
        if (cluster.length && item.start >= clusterEnd) close();
        let lane = lanesEnd.findIndex((end) => end <= item.start);
        if (lane === -1) lane = lanesEnd.length;
        lanesEnd[lane] = item.end;
        item.lane = lane;
        cluster.push(item);
        clusterEnd = Math.max(clusterEnd, item.end);
    });
    if (cluster.length) close();
    return capLanes(items);
};

// Con más de MAX_LANES superpuestas, las que sobran se juntan en un bloque "+N más" por grupo
const capLanes = (items) => {
    const visible = [];
    const overflowByGroup = new Map();
    items.forEach((item) => {
        if (item.lanes <= MAX_LANES) return visible.push(item);
        const lanes = MAX_LANES;
        if (item.lane < lanes - 1) return visible.push({ ...item, lanes });
        // la última columna queda para el bloque "+N"
        const group = overflowByGroup.get(item.group) ?? { start: item.start, end: item.end, events: [], lane: lanes - 1, lanes, more: true };
        group.start = Math.min(group.start, item.start);
        group.end = Math.max(group.end, item.end);
        group.events.push(item.event);
        overflowByGroup.set(item.group, group);
    });
    return [...visible, ...overflowByGroup.values()];
};

// Franja visible: una hora antes de la primera clase y una después de la última (al menos MIN_HOURS)
const hourRange = (byDay) => {
    const items = [...byDay.values()].flat();
    if (!items.length) return DEFAULT_HOURS;
    let from = Math.max(0, Math.floor(Math.min(...items.map((i) => i.start)) / 60) - 1);
    let to = Math.min(24, Math.ceil(Math.max(...items.map((i) => i.end)) / 60) + 1);
    while (to - from < MIN_HOURS) {
        if (from > DEFAULT_HOURS[0]) from--;
        else if (to < 24) to++;
        else break;
    }
    return [from, to];
};

// Escala vertical de la grilla: cada hora con clases mide HOUR_PX y las horas seguidas sin
// ninguna clase en la semana se compactan en una franja de GAP_PX ("12:00 – 17:00")
const buildScale = (fromHour, toHour, items) => {
    const busy = (h) => items.some(({ start, end }) => start < (h + 1) * 60 && end > h * 60);
    const rows = [];
    for (let h = fromHour; h < toHour; h++) {
        const last = rows[rows.length - 1];
        if (busy(h)) rows.push({ start: h * 60, end: (h + 1) * 60, height: HOUR_PX, gap: false });
        else if (last?.gap) last.end = (h + 1) * 60;
        else rows.push({ start: h * 60, end: (h + 1) * 60, height: GAP_PX, gap: true });
    }
    // Una sola hora libre no se compacta: se ve como una hora más
    rows.forEach((row) => {
        if (row.gap && row.end - row.start === 60) Object.assign(row, { gap: false, height: HOUR_PX });
    });
    let y = 0;
    rows.forEach((row) => { row.top = y; y += row.height; });
    const yOf = (minutes) => {
        const row = rows.find((r) => minutes < r.end) ?? rows[rows.length - 1];
        const ratio = Math.min(Math.max((minutes - row.start) / (row.end - row.start), 0), 1);
        return row.top + ratio * row.height;
    };
    return { rows, yOf, height: y, from: fromHour * 60, to: toHour * 60 };
};

const hhmm = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:00`;

const placeBlock = (block, { start, end, lane, lanes }, scale, index) => {
    const top = scale.yOf(start);
    const height = Math.max(scale.yOf(end) - top - 4, 44);
    block.style.top = `${top + 2}px`;
    block.style.height = `${height}px`;
    block.style.left = `calc(${(lane / lanes) * 100}% + 4px)`;
    block.style.width = `calc(${100 / lanes}% - 8px)`;
    block.style.setProperty('--i', index);
    return height;
};

// Bloque "+N más": lleva a la vista lista, al día correspondiente
const buildMoreBlock = (group, scale, index, dayKeyValue) => {
    const block = el('button', 'cal-event cal-more');
    block.type = 'button';
    placeBlock(block, group, scale, index);
    const count = group.events.length;
    block.setAttribute('aria-label', `${count} clases más en este horario. Ver en lista`);
    block.append(el('span', 'cal-more-num', `+${count}`), el('span', 'cal-event-foot', 'Ver'));
    block.addEventListener('click', () => {
        state.view = 'lista';
        syncUrl();
        render();
        document.getElementById(`dia-${dayKeyValue}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return block;
};

const buildBlock = (item, scale, index) => {
    const { event } = item;
    const status = statusOf(event);
    const block = link(`/clases/${event._id}`, `cal-event is-${status}`);
    const height = placeBlock(block, item, scale, index);
    if (height < 60) block.classList.add('is-compact');
    else if (height < 90) block.classList.add('is-short');
    if (item.lanes >= 2) block.classList.add('is-narrow');

    const label = `${event.title}, ${formatTime(event.date)} a ${formatTime(event.endDate)}, ${event.location}. ${statusText(event, status)}.`;
    block.setAttribute('aria-label', label);
    block.title = `${event.title} · ${event.location}`;

    const head = el('div', 'cal-event-time', `${formatTime(event.date)} – ${formatTime(event.endDate)}`);
    const title = el('div', 'cal-event-title', event.title);
    const foot = el('div', 'cal-event-foot');
    foot.append(el('span', null, statusText(event, status)));
    if (status === 'open' && event.capacity) {
        foot.append(meter((event.capacity - availableOf(event)) / event.capacity));
    }
    block.append(head, title, foot);
    return block;
};

const renderWeek = () => {
    const days = weekDays();
    const today = todayKey();
    const byDay = new Map(days.map((key) => [key, []]));
    state.events.forEach((event) => byDay.get(arParts(event.date).key)?.push(event));
    const laid = new Map([...byDay].map(([key, events]) => [key, layoutDay(events)]));
    const [fromHour, toHour] = hourRange(laid);
    const scale = buildScale(fromHour, toHour, [...laid.values()].flat());

    const cal = el('div', `cal ${state.direction > 0 ? 'enter-next' : state.direction < 0 ? 'enter-prev' : ''}`);

    // Cabecera: días de la semana
    const head = el('div', 'cal-days');
    head.append(el('div', 'cal-corner'));
    days.forEach((key, i) => {
        const cell = el('div', `cal-day-head ${key === today ? 'is-today' : ''} ${key < today ? 'is-past' : ''}`);
        cell.style.setProperty('--d', i);
        cell.append(el('span', 'label', WEEKDAYS[i]), el('span', 'cal-day-num', String(dayNumber(key))));
        const count = byDay.get(key).length;
        cell.append(el('span', 'cal-day-count', count ? (count === 1 ? '1 clase' : `${count} clases`) : '—'));
        head.append(cell);
    });

    // Cuerpo: columna de horas + 7 columnas, con una línea por fila y las franjas libres rayadas
    const body = el('div', 'cal-body');
    body.style.height = `${scale.height}px`;
    const hours = el('div', 'cal-hours');
    scale.rows.forEach((row) => {
        const label = el('span', row.gap ? 'is-gap' : null, row.gap ? `${hhmm(row.start)} – ${hhmm(row.end)}` : hhmm(row.start));
        label.style.height = `${row.height}px`;
        hours.append(label);

        const line = el('div', `cal-row ${row.gap ? 'is-gap' : ''}`);
        line.style.top = `${row.top}px`;
        line.style.height = `${row.height}px`;
        line.setAttribute('aria-hidden', 'true');
        body.append(line);
    });
    body.append(hours);

    let index = 0;
    days.forEach((key, i) => {
        const column = el('div', `cal-col ${key === today ? 'is-today' : ''}`);
        column.style.setProperty('--d', i);
        column.setAttribute('role', 'list');
        column.setAttribute('aria-label', `${WEEKDAYS[i]} ${dayNumber(key)}`);
        laid.get(key).forEach((item) => {
            const block = item.more ? buildMoreBlock(item, scale, index++, key) : buildBlock(item, scale, index++);
            block.setAttribute('role', 'listitem');
            column.append(block);
        });
        if (key === today) column.append(nowLine(scale));
        body.append(column);
    });

    cal.append(head, body);
    return cal;
};

// Línea roja de la hora actual en la columna de hoy
const nowLine = (scale) => {
    const line = el('div', 'cal-now');
    line.setAttribute('aria-hidden', 'true');
    const place = () => {
        const minutes = arParts(Date.now()).minutes;
        line.hidden = minutes < scale.from || minutes > scale.to;
        line.style.top = `${scale.yOf(minutes)}px`;
    };
    place();
    clearInterval(nowLine.timer);
    nowLine.timer = setInterval(place, 60 * 1000);
    return line;
};

// ---------- Vista día (mobile) y lista ----------
const buildRow = (event) => {
    const status = statusOf(event);
    const row = el('article', `class-row ${['past', 'full'].includes(status) ? 'is-off' : ''}`);

    const main = el('div', 'class-main');
    const title = el('h2', 'class-title');
    title.append(link(`/clases/${event._id}`, null, event.title));
    main.append(
        el('div', 'label label-red', event.category?.name ?? 'Clase'),
        title,
        el('div', 'class-meta', `${event.location} · ${durationMinutes(event.date, event.endDate)} min · ${formatPrice(event.price)}`)
    );

    const side = el('div', 'class-side');
    const action = el('div', 'class-action');
    if (status === 'booked') {
        side.append(el('div', 'label state-ok', 'Ya reservaste'));
        action.append(link('/mis-reservas', 'btn-ghost', 'Ver reserva'));
    } else if (status === 'open') {
        side.append(el('div', 'label', `Quedan ${availableOf(event)} de ${event.capacity}`),
            meter((event.capacity - availableOf(event)) / event.capacity));
        action.append(link(`/clases/${event._id}`, 'btn', 'Reservar'));
    } else {
        side.append(el('div', 'label', statusText(event, status)));
    }

    row.append(el('span', 'class-time', formatTime(event.date)), main, side, action);
    return row;
};

const dayHeading = (key) => {
    const i = arParts(keyToDate(key)).weekday;
    const head = el('div', 'day-head');
    const full = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'][i];
    head.append(el('span', 'cond', `${full} ${dayNumber(key)}`), el('span', 'label', monthName(key).toUpperCase()));
    if (key === todayKey()) head.append(el('span', 'tag tag-red', 'Hoy'));
    return head;
};

const renderList = (keys) => {
    const wrap = el('div', 'cal-list');
    keys.forEach((key) => {
        const events = state.events.filter((event) => arParts(event.date).key === key);
        if (!events.length && keys.length > 1) return;
        const section = el('section', 'day');
        section.id = `dia-${key}`;
        const rows = el('div', 'stagger');
        events.forEach((event) => rows.append(buildRow(event)));
        if (!events.length) rows.append(el('p', 'muted', 'No hay clases este día.'));
        section.append(dayHeading(key), rows);
        wrap.append(section);
    });
    return wrap;
};

// Tira de días en mobile: un botón por día, con un punto si hay clases
const renderDayStrip = () => {
    const strip = el('div', 'day-strip');
    strip.setAttribute('role', 'tablist');
    strip.setAttribute('aria-label', 'Día');
    const today = todayKey();
    weekDays().forEach((key, i) => {
        const count = state.events.filter((event) => arParts(event.date).key === key).length;
        const button = el('button', `day-pill ${key === today ? 'is-today' : ''}`);
        button.type = 'button';
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', String(key === state.day));
        button.setAttribute('aria-label', `${WEEKDAYS[i]} ${dayNumber(key)}, ${count} clases`);
        button.append(el('span', 'label', WEEKDAYS[i]), el('span', 'day-pill-num', String(dayNumber(key))), el('span', `day-pill-dot ${count ? 'on' : ''}`));
        button.addEventListener('click', () => { state.day = key; render(); });
        strip.append(button);
    });
    return strip;
};

// ---------- Render general ----------
const weekRangeText = () => {
    const [first, , , , , , last] = weekDays();
    const sameMonth = first.slice(5, 7) === last.slice(5, 7);
    return sameMonth
        ? `${dayNumber(first)} – ${dayNumber(last)} ${monthName(last)}`
        : `${dayNumber(first)} ${monthName(first)} – ${dayNumber(last)} ${monthName(last)}`;
};

const renderSummary = () => {
    const total = state.events.length;
    const mine = state.events.filter((event) => bookings.has(event._id)).length;
    const parts = [total === 1 ? '1 clase esta semana' : `${total} clases esta semana`];
    if (advancedNote) parts.unshift(advancedNote);
    if (mine) parts.push(mine === 1 ? '1 reservada por vos' : `${mine} reservadas por vos`);
    summary.textContent = parts.join(' · ');
};

const renderEmpty = () => {
    const box = emptyState({
        eyebrow: 'Semana libre',
        title: state.category ? `Sin clases de ${state.category}` : 'No hay clases esta semana',
        text: 'Mirá la semana que viene o probá con otra disciplina.'
    });
    const next = el('button', 'btn', 'Ver la semana siguiente');
    next.type = 'button';
    next.addEventListener('click', () => changeWeek(1));
    box.append(next);
    return box;
};

const render = () => {
    rangeLabel.textContent = weekRangeText();
    viewButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
    renderSummary();

    board.replaceChildren();
    if (!state.events.length) {
        board.append(renderEmpty());
        return;
    }

    if (state.view === 'lista') {
        board.append(renderList(weekDays()));
    } else if (mobile.matches) {
        if (!weekDays().includes(state.day)) {
            const today = todayKey();
            state.day = weekDays().includes(today)
                ? today
                : arParts(state.events[0].date).key;
        }
        const list = renderList([state.day]);
        list.classList.add(state.direction > 0 ? 'enter-next' : state.direction < 0 ? 'enter-prev' : 'enter');
        board.append(renderDayStrip(), list);
    } else {
        board.append(renderWeek());
    }
    state.direction = 0;
};

let requestId = 0;
const load = async () => {
    syncUrl();
    rangeLabel.textContent = weekRangeText();
    const id = ++requestId;
    board.setAttribute('aria-busy', 'true');
    try {
        const events = await fetchWeek();
        if (id !== requestId) return;   // ya se pidió otra semana
        const upcoming = events.some((event) => new Date(event.endDate) > Date.now());
        if (autoAdvance && !upcoming) {
            autoAdvance = false;
            advancedNote = 'Esta semana ya no quedan clases: te mostramos la próxima';
            state.week = addDays(state.week, 7);
            return load();
        }
        autoAdvance = false;
        state.events = events;
        render();
    } catch (error) {
        if (id !== requestId) return;
        board.replaceChildren(errorState(error.message));
    } finally {
        if (id === requestId) board.setAttribute('aria-busy', 'false');
    }
};

const changeWeek = (delta) => {
    advancedNote = '';
    state.week = addDays(state.week, delta * 7);
    state.direction = delta;
    state.day = null;
    load();
};

// ---------- Disciplinas como chips ----------
const fillChips = async () => {
    try {
        const categories = await loadCategories();
        categories.forEach((category) => {
            const chip = el('button', 'chip', category.name);
            chip.type = 'button';
            chip.dataset.category = category.name;
            chips.append(chip);
        });
    } catch {
        // sin disciplinas queda solo "Todas"
    }
    const markChips = () => chips.querySelectorAll('.chip').forEach((chip) =>
        chip.setAttribute('aria-pressed', String(chip.dataset.category.toLowerCase() === state.category.toLowerCase())));
    markChips();
    chips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        state.category = chip.dataset.category;
        markChips();
        load();
    });
};

// ---------- Eventos de la página ----------
document.getElementById('semanaAnterior').addEventListener('click', () => changeWeek(-1));
document.getElementById('semanaSiguiente').addEventListener('click', () => changeWeek(1));
document.getElementById('semanaHoy').addEventListener('click', () => {
    const current = mondayOf(todayKey());
    advancedNote = '';
    state.direction = Math.sign(keyToDate(current) - keyToDate(state.week));
    state.week = current;
    state.day = todayKey();
    load();
});
viewButtons.forEach((button) => button.addEventListener('click', () => {
    state.view = button.dataset.view;
    syncUrl();
    render();
}));
mobile.addEventListener('change', render);

// Flechas del teclado: cambian de semana (o de día en mobile), salvo que se esté escribiendo
document.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key) || e.target.closest('input, select, textarea')) return;
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    if (mobile.matches && state.view === 'semana' && state.day) {
        const days = weekDays();
        const next = days.indexOf(state.day) + delta;
        if (next >= 0 && next < 7) {
            state.day = days[next];
            state.direction = delta;
            render();
            board.querySelector('.day-pill[aria-selected="true"]')?.focus();
            return;
        }
    }
    changeWeek(delta);
});

// Deslizar el dedo en mobile cambia de día
let touchX = null;
board.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
board.addEventListener('touchend', (e) => {
    if (touchX === null || !mobile.matches || state.view !== 'semana' || !state.day) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) < 60) return;
    const delta = dx < 0 ? 1 : -1;
    const days = weekDays();
    const next = days.indexOf(state.day) + delta;
    if (next < 0 || next > 6) return changeWeek(delta);
    state.day = days[next];
    state.direction = delta;
    render();
}, { passive: true });

await Promise.all([fillChips(), loadBookings()]);
load();
