// public/js/register.js
import { api } from './utils.js';

const form = document.getElementById('registerForm');
const message = document.getElementById('message');

const fail = (text, field) => {
    message.className = 'alert';
    message.textContent = text;
    form.querySelectorAll('[aria-invalid]').forEach((input) => input.removeAttribute('aria-invalid'));
    if (field) {
        form.elements[field].setAttribute('aria-invalid', 'true');
        form.elements[field].focus();
    }
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const first_name = form.elements.first_name.value.trim();
    const last_name = form.elements.last_name.value.trim();
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;

    if (first_name.length < 3) return fail('El nombre tiene que tener al menos 3 letras.', 'first_name');
    if (last_name.length < 3) return fail('El apellido tiene que tener al menos 3 letras.', 'last_name');
    if (!email) return fail('Ingresá tu email.', 'email');
    if (password.length < 6) return fail('La contraseña tiene que tener al menos 6 caracteres.', 'password');
    if (password !== form.elements.confirm.value) return fail('Las contraseñas no coinciden.', 'confirm');

    const button = form.querySelector('button');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');

    try {
        await api('POST', '/api/sessions/register', { first_name, last_name, email, password });
        await api('POST', '/api/sessions/login', { email, password });   // entra directo, sin volver a escribir
        window.location.href = '/clases';
    } catch (error) {
        fail(error.status === 409 ? 'Ese email ya tiene una cuenta. Probá ingresando.' : error.message, error.status === 409 ? 'email' : null);
        button.disabled = false;
        button.removeAttribute('aria-busy');
    }
});
