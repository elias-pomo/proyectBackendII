const btnLogout = document.getElementById('btnLogout');

if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        try {
            await fetch('/api/sessions/logout', { method: 'POST' });
        } finally {
            window.location.href = '/login';
        }
    });
}