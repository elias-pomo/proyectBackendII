const TZ = 'America/Argentina/Buenos_Aires';

// Crea un elemento con texto seguro (textContent): los datos los cargan los organizers,
// así que nunca se insertan como HTML
export const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
};

export const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });

export const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });


export const fetchJson = async (url, options) => {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || 'Error inesperado');
    return data;
};