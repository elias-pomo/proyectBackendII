const form = document.getElementById('registerForm');
const message = document.getElementById('message');

const showMessage = (text, type = 'error') => {
    message.textContent = text;
    message.className = `alert alert-${type}`;
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const first_name = form.elements.first_name.value.trim();
    const last_name = form.elements.last_name.value.trim();
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;

    if (!first_name || !last_name || !email || !password) return showMessage('Completá todos los campos');
    if (first_name.length < 3 || last_name.length < 3) return showMessage('El nombre y el apellido deben tener al menos 3 caracteres');
    if (password.length < 6) return showMessage('La contraseña debe tener al menos 6 caracteres');
    if (password !== form.elements.confirm.value) return showMessage('Las contraseñas no coinciden');

    const button = form.querySelector('button');
    button.disabled = true;

    try {
        const response = await fetch('/api/sessions/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ first_name, last_name, email, password })
        });
        const data = await response.json();

        if (!response.ok) return showMessage(data.message || data.error || 'No se pudo crear la cuenta');

        showMessage('Cuenta creada. Te llevamos al login…', 'success');
        setTimeout(() => { window.location.href = '/login'; }, 1200);
    } catch {
        showMessage('No se pudo conectar con el servidor');
    } finally {
        button.disabled = false;
    }
});