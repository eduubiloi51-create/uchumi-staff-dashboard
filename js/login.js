(function () {
  const API_BASE = window.UCHUMI_API_BASE || '';
  const form = document.getElementById('loginForm');
  const errorBanner = document.getElementById('errorBanner');
  const submitBtn = document.getElementById('submitBtn');

  // Already signed in? Skip straight to the dashboard.
  fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' }).then((res) => {
    if (res.ok) location.href = '/dashboard.html';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBanner.classList.remove('show');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: document.getElementById('email').value.trim(),
          password: document.getElementById('password').value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sign in failed.');
      location.href = '/dashboard.html';
    } catch (err) {
      errorBanner.textContent = err.message;
      errorBanner.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
    }
  });
})();
