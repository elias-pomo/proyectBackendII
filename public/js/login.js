// public/js/login.js
import { api } from './utils.js';

const form = document.getElementById('loginForm');
const message = document.getElementById('message');

// Solo se vuelve a rutas internas: un ?next=https://otro-sitio no se respeta
const nextUrl = () => {
    const next = new URLSearchParams(window.location.search).get('next');
    return next && next.startsWith('/') && !next.startsWith('//') ? next : '/clases';
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    message.textContent = '';

    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    if (!email || !password) {
        message.textContent = 'Completá el email y la contraseña.';
        return;
    }

    const button = form.querySelector('button');
    button.setAttribute('aria-busy', 'true');
    button.disabled = true;

    try {
        await api('POST', '/api/sessions/login', { email, password });
        window.location.href = nextUrl();   // la cookie httpOnly ya quedó seteada por el servidor
    } catch (error) {
        message.textContent = error.status === 401 ? 'Email o contraseña incorrectos.' : error.message;
        button.disabled = false;
        button.removeAttribute('aria-busy');
    }
});
