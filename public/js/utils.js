const TZ = 'America/Argentina/Buenos_Aires';

// Crea un elemento con texto seguro (textContent): los datos los cargan los organizers,
// así que nunca se insertan como HTML
export const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
};

export const link = (href, className, text) => {
    const a = el('a', className, text);
    a.href = href;
    return a;
};

export const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });

export const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });

// "LUN 20 OCT"
export const formatShortDate = (iso) =>
    new Date(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ })
        .replace(/[.,]/g, '').toUpperCase();

// Clave del día en hora argentina, para agrupar la cartelera
export const dayKey = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });

export const formatPrice = (price) => (price > 0 ? `$${Number(price).toLocaleString('es-AR')}` : 'Gratis');

export const durationMinutes = (start, end) => Math.round((new Date(end) - new Date(start)) / 60000);

export const fetchJson = async (url, options) => {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.message || data.error || 'Algo salió mal. Probá de nuevo.');
        error.status = response.status;
        throw error;
    }
    return data;
};

// Atajo para enviar JSON: api('POST', '/api/...', { ... })
export const api = (method, url, body) => fetchJson(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
});

// Usuario de la sesión, que el layout deja en <body data-user-id data-user-role>
export const currentUser = () => {
    const { userId, userRole } = document.body.dataset;
    return userId ? { _id: userId, role: userRole } : null;
};

export const showToast = (text, type = 'ok') => {
    const container = document.getElementById('toasts');
    if (!container) return;
    const toast = el('div', `toast ${type === 'error' ? 'error' : ''}`, text);
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    container.append(toast);
    setTimeout(() => {
        toast.classList.add('leaving');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, 4200);
};

// Confirmación con <dialog> nativo (foco atrapado y Escape para cerrar). Devuelve true si confirma.
export const confirmDialog = ({ eyebrow, title, text, confirmLabel = 'Confirmar', cancelLabel = 'Volver' }) =>
    new Promise((resolve) => {
        const dialog = el('dialog', 'dialog');
        const form = el('form');
        form.method = 'dialog';

        const kicker = el('div', 'label label-red', eyebrow);
        const heading = el('h2', 'display display-sm', title);
        heading.id = `dlg-${Date.now()}`;
        dialog.setAttribute('aria-labelledby', heading.id);
        const body = el('p', null, text);

        const actions = el('div', 'dialog-actions');
        const cancel = el('button', 'btn-ghost', cancelLabel);
        cancel.value = 'no';
        const confirm = el('button', 'btn', confirmLabel);
        confirm.value = 'si';
        actions.append(cancel, confirm);

        form.append(kicker, heading, body, actions);
        dialog.append(form);
        document.body.append(dialog);

        dialog.addEventListener('close', () => {
            resolve(dialog.returnValue === 'si');
            dialog.remove();
        }, { once: true });
        dialog.showModal();
        cancel.focus();
    });

// Estado vacío con una acción concreta
export const emptyState = ({ eyebrow, title, text, href, action }) => {
    const box = el('div', 'empty');
    if (eyebrow) box.append(el('div', 'label', eyebrow));
    box.append(el('h2', null, title), el('p', null, text));
    if (href) box.append(link(href, 'btn', action));
    return box;
};

export const errorState = (message) => emptyState({ eyebrow: 'No pudimos cargar esto', title: 'Algo falló', text: message });

// Nombres de las disciplinas. /api/categories pide sesión: sin sesión se sacan de las clases publicadas
const categoriesFromEvents = async () => {
    const { data } = await fetchJson('/api/events?status=published&limit=50');
    const byName = new Map();
    data.forEach((event) => {
        if (event.category?.name) byName.set(event.category.name, event.category);
    });
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
};

export const loadCategories = async () => {
    if (!currentUser()) return categoriesFromEvents();
    try {
        const { payload } = await fetchJson('/api/categories');
        return payload;
    } catch {
        return categoriesFromEvents();
    }
};

// Medidor de cupo (barra fina)
export const meter = (ratio) => {
    const bar = el('div', 'meter');
    const fill = el('span');
    fill.style.width = `${Math.min(Math.max(ratio, 0), 1) * 100}%`;
    bar.append(fill);
    bar.setAttribute('aria-hidden', 'true');
    return bar;
};

// Valor de un <input type="datetime-local"> a partir de una fecha ISO, en la hora local del navegador
export const toLocalInput = (iso) => {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const ACTIVE_TICKET = ['confirmed', 'pending'];
