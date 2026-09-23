(function () {
  const API_BASE = window.UCHUMI_API_BASE || '';
  let me = null;
  let branches = [];
  let page = 1;
  const pageSize = 20;
  let lastTotal = 0;
  let charts = {};

  const $ = (id) => document.getElementById(id);

  async function api(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...opts,
    });
    if (res.status === 401) {
      location.href = '/';
      throw new Error('Not signed in');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function currentFilters() {
    const p = new URLSearchParams();
    const branch = $('filterBranch').value;
    if (branch && (me.role !== 'manager' || branch === String(me.branch_id))) p.set('branch_id', branch);
    if ($('filterType').value) p.set('type', $('filterType').value);
    if ($('filterCategory').value) p.set('category', $('filterCategory').value);
    if ($('filterStatus').value) p.set('status', $('filterStatus').value);
    if ($('filterFrom').value) p.set('from', $('filterFrom').value);
    if ($('filterTo').value) p.set('to', $('filterTo').value);
    return p;
  }

  function fmtDate(iso) {
    const d = new Date(iso + 'Z');
    return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) + ' ' +
      d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  }

  // ---------- Tabs ----------
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      $(`panel-${btn.dataset.panel}`).classList.add('active');
      $('filters').style.display = ['overview', 'feedback'].includes(btn.dataset.panel) ? 'flex' : 'none';
      if (btn.dataset.panel === 'staff') loadStaff();
    });
  });

  // ---------- KPIs + charts ----------
  async function loadOverview() {
    const stats = await api(`/api/dashboard/stats?${currentFilters()}`);

    $('kpiGrid').innerHTML = `
      <div class="card kpi"><div class="label">Total feedback</div><div class="value">${stats.total}</div></div>
      <div class="card kpi"><div class="label">Average rating</div><div class="value">${stats.avg_rating ?? '—'}${stats.avg_rating ? ' / 5' : ''}</div></div>
      <div class="card kpi"><div class="label">Complaints</div><div class="value">${stats.complaints}</div></div>
      <div class="card kpi ${stats.open_complaints > 0 ? 'alert' : ''}"><div class="label">Open complaints</div><div class="value">${stats.open_complaints}</div></div>
    `;

    const palette = ['#ff000e', '#1a1a1a', '#c40010', '#6b6b6b', '#8f000b'];

    renderChart('ratingChart', 'bar', {
      labels: stats.by_rating.map((r) => `${r.rating}★`),
      datasets: [{ data: stats.by_rating.map((r) => r.n), backgroundColor: '#ff000e', borderRadius: 6 }],
    });

    renderChart('categoryChart', 'bar', {
      labels: stats.by_category.map((c) => c.category),
      datasets: [{ data: stats.by_category.map((c) => c.n), backgroundColor: '#1a1a1a', borderRadius: 6 }],
    }, { indexAxis: 'y' });

    renderChart('trendChart', 'line', {
      labels: stats.trend.map((t) => t.day.slice(5)),
      datasets: [{
        data: stats.trend.map((t) => t.n),
        borderColor: '#ff000e', backgroundColor: 'rgba(255,0,14,0.10)', tension: 0.35, fill: true,
      }],
    });

    renderChart('branchChart', 'bar', {
      labels: stats.by_branch.map((b) => b.branch),
      datasets: [{
        data: stats.by_branch.map((b) => b.n),
        backgroundColor: stats.by_branch.map((_, i) => palette[i % palette.length]),
        borderRadius: 6,
      }],
    });
  }

  function renderChart(canvasId, type, data, extraOptions = {}) {
    if (charts[canvasId]) charts[canvasId].destroy();
    charts[canvasId] = new Chart($(canvasId).getContext('2d'), {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: type === 'line' || type === 'bar' ? { y: { beginAtZero: true, ticks: { precision: 0 } } } : {},
        ...extraOptions,
      },
    });
  }

  // ---------- Feedback table ----------
  async function loadFeedback() {
    const p = currentFilters();
    p.set('page', page);
    p.set('pageSize', pageSize);
    const data = await api(`/api/dashboard/feedback?${p}`);
    lastTotal = data.total;

    $('resultCount').textContent = `${data.total} result${data.total === 1 ? '' : 's'}`;
    $('pageLabel').textContent = `Page ${data.page} of ${Math.max(1, Math.ceil(data.total / pageSize))}`;

    if (!data.rows.length) {
      $('feedbackBody').innerHTML = `<tr><td colspan="8" class="empty-state">No feedback matches these filters.</td></tr>`;
      return;
    }

    $('feedbackBody').innerHTML = data.rows.map((r) => `
      <tr>
        <td>${fmtDate(r.created_at)}</td>
        <td>${r.branch_name}</td>
        <td>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</td>
        <td><span class="badge badge-${r.type}">${r.type}</span></td>
        <td>${r.category}</td>
        <td class="msg">${escapeHtml(r.message)}${r.price_product ? `<div class="price-note">${escapeHtml(r.price_product)}${r.price_uchumi ? ' — Uchumi: KSh ' + escapeHtml(r.price_uchumi) : ''}${r.price_elsewhere ? ' vs KSh ' + escapeHtml(r.price_elsewhere) + (r.price_elsewhere_shop ? ' at ' + escapeHtml(r.price_elsewhere_shop) : ' elsewhere') : ''}</div>` : ''}</td>
        <td>${r.customer_name || r.customer_phone || r.customer_email
          ? [r.customer_name, r.customer_phone, r.customer_email].filter(Boolean).map(escapeHtml).join('<br>')
          : '<span style="color:var(--ink-soft)">Anonymous</span>'}</td>
        <td>
          <select class="status-select" data-id="${r.id}">
            <option value="new" ${r.status === 'new' ? 'selected' : ''}>New</option>
            <option value="in_review" ${r.status === 'in_review' ? 'selected' : ''}>In review</option>
            <option value="resolved" ${r.status === 'resolved' ? 'selected' : ''}>Resolved</option>
          </select>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.status-select').forEach((sel) => {
      sel.addEventListener('change', async () => {
        try {
          await api(`/api/dashboard/feedback/${sel.dataset.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: sel.value }),
          });
        } catch (err) {
          alert(err.message);
        }
      });
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  async function refreshAll() {
    page = 1;
    await Promise.all([loadOverview(), loadFeedback()]);
  }

  document.querySelectorAll('#filters select, #filters input').forEach((el) => {
    el.addEventListener('change', refreshAll);
  });
  $('prevPage').addEventListener('click', () => { if (page > 1) { page--; loadFeedback(); } });
  $('nextPage').addEventListener('click', () => { if (page * pageSize < lastTotal) { page++; loadFeedback(); } });
  $('exportBtn').addEventListener('click', () => {
    window.open(`${API_BASE}/api/dashboard/export.csv?${currentFilters()}`, '_blank');
  });

  // ---------- QR codes ----------
  function loadQr() {
    $('qrGrid').innerHTML = branches.map((b) => `
      <div class="card qr-card">
        <strong>${b.name}</strong>
        <img src="${API_BASE}/api/qr/${b.slug}.png" alt="QR code for ${b.name}" />
        <div class="addr">${b.address || ''}</div>
        <a class="btn btn-ghost btn-sm" href="${API_BASE}/api/qr/${b.slug}.png" download="${b.slug}-feedback-qr.png" style="margin-top:0.75rem;">Download PNG</a>
      </div>
    `).join('');
  }

  // ---------- Staff management (CEO only) ----------
  async function loadStaff() {
    if (me.role !== 'ceo') return;
    const list = await api('/api/users');
    $('staffList').innerHTML = list.map((u) => `
      <div class="staff-row">
        <div>
          <div>${escapeHtml(u.name)} <span class="meta">(${u.email})</span></div>
          <div class="meta">${u.role}${u.branch_name ? ' · ' + u.branch_name : ''}</div>
        </div>
        ${u.id !== me.id ? `<button class="btn btn-ghost btn-sm" data-remove="${u.id}">Remove</button>` : ''}
      </div>
    `).join('') || '<p class="empty-state">No staff accounts yet.</p>';

    document.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remove this staff account?')) return;
        await api(`/api/users/${btn.dataset.remove}`, { method: 'DELETE' });
        loadStaff();
      });
    });
  }

  $('addStaffBtn')?.addEventListener('click', async () => {
    $('staffError').classList.remove('show');
    try {
      await api('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: $('staffName').value.trim(),
          email: $('staffEmail').value.trim(),
          password: $('staffPassword').value,
          role: $('staffRole').value,
          branch_id: $('staffRole').value === 'manager' ? Number($('staffBranch').value) : null,
        }),
      });
      $('staffName').value = '';
      $('staffEmail').value = '';
      $('staffPassword').value = '';
      loadStaff();
    } catch (err) {
      $('staffError').textContent = err.message;
      $('staffError').classList.add('show');
    }
  });

  $('staffRole')?.addEventListener('change', () => {
    $('staffBranch').style.display = $('staffRole').value === 'manager' ? '' : 'none';
  });

  // ---------- Bootstrap ----------
  $('logoutBtn').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    location.href = '/';
  });

  (async function init() {
    try {
      me = await api('/api/auth/me');
    } catch {
      return; // already redirected to login
    }

    $('userName').textContent = me.name;
    $('userRole').textContent = { ceo: 'CEO / Head office', supervisor: 'Supervisor', manager: 'Branch manager' }[me.role] || me.role;
    if (me.role === 'ceo') $('staffTabBtn').style.display = '';

    branches = await api('/api/branches');
    const branchSelect = $('filterBranch');
    const staffBranch = $('staffBranch');
    branches.forEach((b) => {
      branchSelect.insertAdjacentHTML('beforeend', `<option value="${b.id}">${b.name}</option>`);
      staffBranch.insertAdjacentHTML('beforeend', `<option value="${b.id}">${b.name}</option>`);
    });

    if (me.role === 'manager') {
      branchSelect.value = me.branch_id;
      branchSelect.disabled = true;
    }

    loadQr();
    refreshAll();
  })();
})();
