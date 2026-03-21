document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');

    errorMsg.style.display = 'none';

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        
        if (data.ok) {
            sessionStorage.setItem('adminToken', data.token);
            window.location.href = 'admin.html';
        } else {
            errorMsg.style.display = 'block';
            errorMsg.textContent = data.mensaje || 'Error al iniciar sesión';
        }
    } catch (err) {
        console.error("Login error:", err);
        errorMsg.style.display = 'block';
        errorMsg.textContent = 'Error de conexión con el servidor';
    }
});
