const form = document.getElementById('loginForm');
const message = document.getElementById('message');

const showMessage = (text, type = 'error') => {
    message.textContent = text;
    message.className = `alert alert-${type}`;
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;

    if (!email || !password) return showMessage('Completá el email y la contraseña');

    const button = form.querySelector('button');
    button.disabled = true;

    try {
        const response = await fetch('/api/sessions/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (!response.ok) return showMessage(data.message || data.error || 'No se pudo iniciar sesión');

        window.location.href = '/';   // la cookie httpOnly ya quedó seteada por el servidor
    } catch {
        showMessage('No se pudo conectar con el servidor');
    } finally {
        button.disabled = false;
    }
});