// public/js/home.js
import { el, link, fetchJson, formatShortDate, formatTime, loadCategories } from './utils.js';

const loadNextClass = async () => {
    const box = document.getElementById('proximaClase');
    try {
        const params = new URLSearchParams({ status: 'published', dateFrom: new Date().toISOString(), sort: 'date', limit: '1' });
        const { data } = await fetchJson(`/api/events?${params}`);
        const [event] = data;

        const header = el('div', 'row label');
        header.append(el('span', null, 'Próxima clase'));
        box.replaceChildren(header);

        if (!event) {
            box.append(el('p', 'muted', 'Todavía no hay clases programadas.'));
            return;
        }

        header.append(el('span', null, formatShortDate(event.date)));
        const when = el('div', 'when');
        when.append(el('span', 'class-time', formatTime(event.date)), el('span', 'cond', event.title));

        const footer = el('div', 'row label');
        const available = event.available ?? event.capacity;
        const full = available === 0;
        footer.append(
            el('span', null, full ? 'Completa' : `Quedan ${available}`),
            link(`/clases/${event._id}`, 'label-red', full ? 'Ver clase →' : 'Reservar →')
        );
        box.append(when, footer);
    } catch {
        box.replaceChildren(el('p', 'muted', 'No pudimos cargar la próxima clase.'));
    }
};

// Fotos de public/img por disciplina: el encuadre apunta al gesto de cada foto en la tarjeta angosta
// tagline: se usa cuando la disciplina viene sin descripción (sin sesión se arman desde las clases publicadas)
const DISCIPLINE_PHOTOS = {
    boxeo: { position: '45% 40%', alt: 'Boxeador pegándole a la bolsa', tagline: 'Guardia, combinaciones y trabajo de bolsa y manoplas.' },
    funcional: { position: '50% 45%', alt: 'Flexiones con mancuernas', tagline: 'Fuerza, potencia y aire para aguantar los rounds.' },
    kickboxing: { position: '40% 45%', alt: 'Patada de kickboxing a la bolsa', tagline: 'Puños y patadas con técnica, ritmo y control.' },
    mma: { position: '45% 40%', alt: 'Combate de MMA en el piso de la jaula', tagline: 'Golpeo, derribos y control en el piso.' },
    taekwondo: { position: '50% 40%', alt: 'Patada de taekwondo', tagline: 'Patadas, velocidad y técnica, para juniors y adultos.' }
};

// Orden en que se presentan en el inicio; las que no estén acá van al final
const DISCIPLINE_ORDER = ['boxeo', 'kickboxing', 'mma', 'taekwondo', 'funcional'];
const MAX_DISCIPLINES = 5;

// "Kickboxing" → "kickboxing", "Artes Marciales" → "artes-marciales"
const slugify = (name) => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, '-');

const disciplinePhoto = (category) => {
    const slug = slugify(category.name);
    const photo = DISCIPLINE_PHOTOS[slug];
    if (!photo) return el('div', 'placeholder', category.name.toUpperCase());

    const img = el('img', 'discipline-photo');
    img.src = `/img/${slug}.jpg`;
    img.alt = photo.alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 1671;
    img.height = 941;
    img.style.objectPosition = photo.position;
    // Si la foto todavía no se subió, queda el recuadro con el nombre
    img.addEventListener('error', () => img.replaceWith(el('div', 'placeholder', category.name.toUpperCase())), { once: true });
    return img;
};

const loadDisciplines = async () => {
    const container = document.getElementById('disciplinasLista');
    try {
        const categories = await loadCategories();
        container.replaceChildren();
        if (!categories.length) {
            container.append(el('p', 'muted', 'Pronto vas a ver las disciplinas acá.'));
            return;
        }
        const rank = (category) => {
            const position = DISCIPLINE_ORDER.indexOf(slugify(category.name));
            return position === -1 ? DISCIPLINE_ORDER.length : position;
        };
        const sorted = [...categories].sort((a, b) => rank(a) - rank(b)).slice(0, MAX_DISCIPLINES);
        container.style.setProperty('--n', sorted.length);
        sorted.forEach((category, index) => {
            const card = link(`/clases?category=${encodeURIComponent(category.name)}`, 'discipline');
            const body = el('div', 'discipline-body');
            body.append(
                el('div', 'label label-red', String(index + 1).padStart(2, '0')),
                el('div', 'discipline-name', category.name),
                el('div', 'muted', category.description || DISCIPLINE_PHOTOS[slugify(category.name)]?.tagline || 'Clases para todos los niveles.')
            );
            const media = el('div', 'discipline-media');
            media.append(disciplinePhoto(category));
            card.append(media, body);
            container.append(card);
        });
    } catch {
        container.replaceChildren(el('p', 'muted', 'No pudimos cargar las disciplinas.'));
    }
};

loadNextClass();
loadDisciplines();
