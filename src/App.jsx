import React, { useEffect, useMemo, useRef, useState } from 'react';
import { appBase, get, isDemoMode, post, postForm, setCsrfToken } from './api.js';

const BASE = appBase();
const titleByPath = {
  '/dashboard.php': 'Dashboard', '/vendors/index.php': 'Data Vendor', '/vendors/create.php': 'Tambah Vendor',
  '/vendors/edit.php': 'Edit Vendor', '/vendors/detail.php': 'Detail Vendor', '/kriterias/index.php': 'Kriteria & Bobot',
  '/kriterias/view.php': 'Kriteria & Bobot', '/kriterias/create.php': 'Tambah Kriteria', '/kriterias/edit.php': 'Edit Kriteria',
  '/kriterias/bobot.php': 'Atur Bobot', '/penilaian/index.php': 'Penilaian Vendor', '/penilaian/input.php': 'Input Penilaian',
  '/penilaian/edit.php': 'Edit Penilaian', '/saw/index.php': 'Perhitungan SAW', '/saw/ranking.php': 'Hasil Ranking',
  '/users/index.php': 'Manajemen User', '/users/create.php': 'Tambah Admin', '/users/edit.php': 'Edit User', '/users/profile.php': 'Profil Saya',
};

function parseRoute() {
  let path = window.location.pathname;
  if (path.startsWith(BASE)) path = path.slice(BASE.length) || '/';
  return { path, query: new URLSearchParams(window.location.search) };
}

function moveTo(target, replace = false) {
  const url = `${BASE}${target.startsWith('/') ? target : `/${target}`}`;
  window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function Button({ children, variant = '', ...props }) { return <button className={`btn ${variant}`.trim()} {...props}>{children}</button>; }
function LinkButton({ to, children, variant = 'btn-light', onClick }) {
  return <a className={`btn ${variant}`} href={`${BASE}${to}`} onClick={(event) => { event.preventDefault(); onClick ? onClick() : moveTo(to); }}>{children}</a>;
}
function Card({ title, action, children, className = '' }) {
  return <section className={`card ${className}`}><div className="card-heading">{title && <h2>{title}</h2>}{action}</div>{children}</section>;
}
function PageHeading({ title, subtitle, action }) {
  return <div className="page-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}
function Loading({ label = 'Memuat data…' }) { return <div className="loading-box"><span className="spinner" />{label}</div>; }
function ErrorMessage({ error }) {
  if (!error) return null;
  return <div className="notice notice-error" role="alert">{error.message || String(error)}</div>;
}
function Empty({ icon = '◌', children }) { return <div className="empty-state"><span>{icon}</span><p>{children}</p></div>; }
function TextField({ label, value, onChange, error, type = 'text', ...props }) {
  return <label className="field"><span>{label}</span><input type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={error ? 'invalid' : ''} {...props} />{error && <small className="field-error">{error}</small>}</label>;
}
function SelectField({ label, value, onChange, children, error, ...props }) {
  return <label className="field"><span>{label}</span><select value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={error ? 'invalid' : ''} {...props}>{children}</select>{error && <small className="field-error">{error}</small>}</label>;
}
function FormError({ error }) { return <ErrorMessage error={error} />; }
function Table({ headers, children, empty, className = '' }) {
  return (
    <div className={`table-wrap ${className}`.trim()}>
      {React.Children.count(children) > 0 ? (
        <table>
          <thead>
            <tr>
              {headers.map((head, idx) =>
                React.isValidElement(head) ? (
                  React.cloneElement(head, { key: head.key || idx })
                ) : (
                  <th key={idx}>{head}</th>
                )
              )}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      ) : (
        <Empty>{empty || 'Belum ada data.'}</Empty>
      )}
    </div>
  );
}
function formatPeriod(period) {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return period || '—';
  const [year, month] = period.split('-');
  return `${new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(Number(year), Number(month) - 1, 1))} ${year}`;
}
function formatDate(value) {
  if (!value) return 'Belum tercatat';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function fieldErrors(error) { return error?.details?.fields || {}; }

function ConfirmModal({ isOpen, title, message, confirmText = 'Ya, Lanjutkan', cancelText = 'Batal', danger = false, onConfirm, onCancel }) {
  const modalRef = useRef(null);
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    cancelBtnRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleKeyDownTrap = (e) => {
    if (e.key === 'Tab') {
      const focusableEls = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableEls || focusableEls.length === 0) return;
      const firstEl = focusableEls[0];
      const lastEl = focusableEls[focusableEls.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
  };

  return (
    <div
      className="confirm-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      onKeyDown={handleKeyDownTrap}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div className="confirm-modal-dialog" ref={modalRef}>
        <div className="confirm-modal-header">
          <span className={`confirm-modal-icon ${danger ? 'icon-danger' : 'icon-info'}`} aria-hidden="true">
            {danger ? '⚠️' : 'ℹ️'}
          </span>
          <h2 id="confirm-modal-title" className="confirm-modal-title">{title}</h2>
        </div>
        <div className="confirm-modal-body">
          <p id="confirm-modal-desc">{message}</p>
        </div>
        <div className="confirm-modal-actions">
          <button
            type="button"
            ref={cancelBtnRef}
            className="btn btn-light"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onAuthenticated }) {
  const [form, setForm] = useState(
    isDemoMode
      ? { username: 'demo_superadmin', password: 'demo-password' }
      : { username: '', password: '' }
  );
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(null);
    try { const result = await post('auth', 'login', form); setCsrfToken(result.csrf); onAuthenticated(result.user); }
    catch (err) { setError(err); }
    finally { setBusy(false); }
  }
  return <div className="login-screen"><div className="login-card">
    <div className="login-brand"><span className="brand-mark">K</span><div><strong>SPK Kikost</strong><small>Vendor Laundry Decision Support</small></div></div>
    <div className="login-intro"><span className="eyebrow">Selamat datang kembali</span><h1>Masuk ke sistem</h1><p>Kelola evaluasi vendor laundry dengan lebih terarah.</p></div>
    {isDemoMode && (
      <div className="demo-login-callout" role="note">
        <strong>Mode Demo Visual</strong>
        <p>Akses akun Superadmin sintetis telah disiapkan. Klik tombol di bawah untuk langsung mencoba tampilan sistem.</p>
      </div>
    )}
    <FormError error={error} />
    <form onSubmit={submit} className="form-stack">
      <TextField label="Username" autoComplete="username" value={form.username} onChange={(username) => setForm({ ...form, username })} required />
      <TextField label="Password" type="password" autoComplete="current-password" value={form.password} onChange={(password) => setForm({ ...form, password })} required />
      <Button variant="btn-primary btn-wide" disabled={busy}>{busy ? 'Memeriksa…' : 'Masuk ke dashboard'} <span aria-hidden="true">→</span></Button>
    </form>
    <p className="login-footnote">Akses sistem menggunakan akun yang diberikan pengelola.</p>
  </div><div className="login-decoration"><span>SAW</span><p>Evaluasi vendor yang lebih transparan, terukur, dan konsisten.</p></div></div>;
}

function AppShell({ user, route, navigate, onLogout, children }) {
  const path = route.path;
  const active = path.startsWith('/vendors') ? 'vendor' : path.startsWith('/kriterias') ? 'criteria' : path.startsWith('/penilaian') ? 'assessment' : path.startsWith('/saw/ranking') ? 'ranking' : path.startsWith('/saw') ? 'saw' : path.startsWith('/users') && path !== '/users/profile.php' ? 'users' : path === '/users/profile.php' ? 'profile' : 'dashboard';
  const nav = [
    { group: 'Menu utama', items: [
      ['dashboard', '◫', 'Dashboard', '/dashboard.php'], ['vendor', '▣', 'Data Vendor', '/vendors/index.php'],
      ['criteria', '◈', 'Kriteria & Bobot', user.role === 'superadmin' ? '/kriterias/index.php' : '/kriterias/view.php'],
      ['assessment', '▤', 'Penilaian Vendor', '/penilaian/index.php'], ['saw', '∑', 'Perhitungan SAW', '/saw/index.php'], ['ranking', '♛', 'Hasil Ranking', '/saw/ranking.php'],
    ] },
    ...(user.role === 'superadmin' ? [{ group: 'Administrasi', items: [['users', '♙', 'Manajemen User', '/users/index.php']] }] : []),
  ];
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return <div className="app-shell">
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Tutup navigasi" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand"><span className="brand-mark">K</span><div><strong>kikost</strong><small>DECISION CENTER</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map((section) => <div className="nav-section" key={section.group}><div className="nav-label">{section.group}</div>{section.items.map(([key, icon, label, to]) => <a key={key} href={`${BASE}${to}`} className={`nav-link ${active === key ? 'nav-active' : ''}`} onClick={(e) => { e.preventDefault(); setSidebarOpen(false); navigate(to); }}><span>{icon}</span>{label}</a>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-tip"><span>✦</span><p>Keputusan yang baik dimulai dari data yang lengkap.</p></div><button className="logout-link" onClick={onLogout}><span>↪</span> Keluar dari akun</button></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><button className="menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Buka navigasi">☰</button><div className="crumb"><span>SPK Kikost</span><b>/</b><strong>{titleByPath[path] || 'Dashboard'}</strong></div><div className="topbar-account"><span className="online-dot" /><a href={`${BASE}/users/profile.php`} onClick={(e) => { e.preventDefault(); navigate('/users/profile.php'); }} className="account-link"><span className="avatar">{user.foto ? <img src={`${BASE}/assets/uploads/profiles/${encodeURIComponent(user.foto)}`} alt="" /> : (user.nama || 'K').slice(0, 1).toUpperCase()}</span><span className="account-copy"><b>{user.nama}</b><small>{user.role === 'superadmin' ? 'Superadmin' : 'Admin'}</small></span><span className="chevron">⌄</span></a></div></header>
      {isDemoMode && (
        <aside className="demo-ribbon" role="status" aria-label="Status Mode Demo">
          <span className="demo-ribbon-badge">MODE DEMO</span>
          <span className="demo-ribbon-text">
            Sistem berjalan dengan data contoh untuk simulasi visual. Perubahan data bersifat simulasi lokal dan tidak memengaruhi database riil.
          </span>
        </aside>
      )}
      <main className="main-content">{children}</main>
      <footer className="app-footer"><span>SPK Kikost · {new Date().getFullYear()}</span><span>Simple Additive Weighting</span></footer>
    </div>
  </div>;
}

const CRITERIA_COLORS = [
  '#2B0B8C', '#4318FF', '#6366F1', '#8B5CF6',
  '#A855F7', '#C084FC', '#84CC16', '#C9FC2B'
];

function ViBarChart({ ranking, period, onAction }) {
  if (!ranking || ranking.length === 0) {
    return (
      <div className="chart-empty">
        <span className="chart-empty-icon">📊</span>
        <p>Belum ada data nilai preferensi (Vi) untuk periode ini.</p>
        <small>Lengkapi penilaian seluruh vendor aktif agar perhitungan SAW menghasilkan peringkat.</small>
        {onAction && (
          <Button variant="btn-primary btn-small" onClick={onAction}>
            Input Penilaian Vendor →
          </Button>
        )}
      </div>
    );
  }

  const maxVi = 1.0;
  const chartHeight = 150;
  const chartWidth = 500;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 24;
  const padBottom = 65;
  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight;
  const count = ranking.length;
  const slotW = plotW / count;
  const barW = Math.min(42, Math.max(22, slotW * 0.52));

  return (
    <div className="svg-chart-container">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + padTop + padBottom}`}
        className="svg-chart"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="viBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#2B0B8C" />
          </linearGradient>
          <linearGradient id="viWinnerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4FF32" />
            <stop offset="100%" stopColor="#A3E635" />
          </linearGradient>
        </defs>

        {/* Garis bantu horizontal */}
        {[1.0, 0.75, 0.5, 0.25, 0].map((val) => {
          const y = padTop + plotH - (val / maxVi) * plotH;
          return (
            <g key={val}>
              <line
                x1={padLeft}
                y1={y}
                x2={chartWidth - padRight}
                y2={y}
                stroke={val === 0 ? '#CBD5E1' : '#F1F5F9'}
                strokeDasharray={val === 0 ? undefined : '3 3'}
                strokeWidth={val === 0 ? 1.5 : 1}
              />
              <text
                x={padLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                className="chart-axis-label"
              >
                {val.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Batang nilai per vendor */}
        {ranking.map((item, idx) => {
          const vi = Math.max(0, Math.min(1, Number(item.nilai_akhir) || 0));
          const h = vi * plotH;
          const x = padLeft + idx * slotW + (slotW - barW) / 2;
          const y = padTop + plotH - h;
          const isWinner = idx === 0;

          // Multi-line word wrapping without slicing or truncation
          const words = (item.nama_vendor || '').trim().split(/\s+/);
          let line1 = item.nama_vendor;
          let line2 = null;
          if (words.length >= 3) {
            line1 = words.slice(0, 2).join(' ');
            line2 = words.slice(2).join(' ');
          } else if (words.length === 2 && item.nama_vendor.length > 12) {
            line1 = words[0];
            line2 = words[1];
          }

          return (
            <g key={item.vendor_id || idx} className="chart-bar-group">
              <title>{item.nama_vendor}: {vi.toFixed(4)} (Peringkat #{idx + 1})</title>
              <text
                x={x + barW / 2}
                y={Math.max(12, y - 6)}
                textAnchor="middle"
                className={`chart-val-label ${isWinner ? 'winner-val' : ''}`}
              >
                {vi.toFixed(4)}
              </text>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={5}
                ry={5}
                fill={isWinner ? 'url(#viWinnerGrad)' : 'url(#viBarGrad)'}
                className="chart-bar"
              />
              <text
                x={x + barW / 2}
                y={padTop + plotH + 18}
                textAnchor="middle"
                className="chart-x-name"
              >
                {line2 ? (
                  <>
                    <tspan x={x + barW / 2} dy="0">{line1}</tspan>
                    <tspan x={x + barW / 2} dy="14">{line2}</tspan>
                  </>
                ) : (
                  line1
                )}
              </text>
              <text
                x={x + barW / 2}
                y={padTop + plotH + (line2 ? 46 : 34)}
                textAnchor="middle"
                className={`chart-x-rank ${isWinner ? 'winner-rank' : ''}`}
              >
                {`#${idx + 1}`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CriteriaDonutChart({ criteria, weightTotal, weightValid }) {
  if (!criteria || criteria.length === 0 || weightTotal <= 0) {
    return (
      <div className="chart-empty">
        <span className="chart-empty-icon">◈</span>
        <p>Belum ada bobot kriteria yang dapat digambarkan.</p>
      </div>
    );
  }

  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const slices = criteria.map((item, idx) => {
    const w = Math.max(0, Number(item.bobot) || 0);
    const pct = weightTotal > 0 ? (w / weightTotal) : 0;
    const dashLength = pct * circumference;
    const dashOffset = accumulatedPercent * circumference;
    accumulatedPercent += pct;
    return {
      item,
      color: CRITERIA_COLORS[idx % CRITERIA_COLORS.length],
      pct,
      dashLength,
      dashOffset,
    };
  });

  return (
    <div className="donut-panel">
      <div className="donut-chart-wrap">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="svg-donut"
          width={size}
          height={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#F1F0FB"
            strokeWidth={strokeWidth}
          />
          {slices.map((slice, i) => (
            <circle
              key={slice.item.id || i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${slice.dashLength} ${circumference - slice.dashLength}`}
              strokeDashoffset={-slice.dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="donut-slice"
            />
          ))}
        </svg>
        <div className="donut-center-info">
          <strong>{Number(weightTotal).toFixed(0)}%</strong>
          <span className={`status-pill ${weightValid ? 'pill-success' : 'pill-warning'}`}>
            {weightValid ? 'Valid 100%' : 'Belum Valid'}
          </span>
        </div>
      </div>

      <div className="donut-legend-grid">
        {criteria.map((item, idx) => {
          const color = CRITERIA_COLORS[idx % CRITERIA_COLORS.length];
          return (
            <div key={item.id} className="donut-legend-item">
              <span className="donut-legend-dot" style={{ backgroundColor: color }} />
              <div className="donut-legend-desc">
                <span className="donut-legend-title">
                  <b>{item.kode}</b> · {item.nama_kriteria}
                </span>
                <span className="donut-legend-sub">
                  <span className="type-chip-sub">{item.jenis}</span>
                  <strong>{Number(item.bobot).toFixed(1)}%</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardPage({ user, route, navigate }) {
  const period = route.query.get('periode') || '';
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    get('dashboard', period ? { periode: period } : {})
      .then((value) => alive && setData(value))
      .catch((err) => alive && setError(err));
    return () => { alive = false; };
  }, [period]);

  if (error) return (
    <>
      <PageHeading title="Dashboard" subtitle="Ringkasan evaluasi vendor laundry." />
      <ErrorMessage error={error} />
    </>
  );

  if (!data) return <Loading />;

  const m = data.metrics;
  const c = data.completeness;
  const pct = Math.max(0, Math.min(100, c.percent));
  const hasRanking = Array.isArray(data.ranking) && data.ranking.length > 0;

  return (
    <>
      <PageHeading
        title="Dashboard"
        subtitle="Pantau kualitas evaluasi, perbandingan nilai preferensi, dan performa vendor laundry."
        action={
          <label className="period-select">
            <span>Periode</span>
            <select
              value={data.periode}
              onChange={(e) => navigate(`/dashboard.php?periode=${encodeURIComponent(e.target.value)}`)}
            >
              {data.periods.map((p) => (
                <option key={p} value={p}>{formatPeriod(p)}</option>
              ))}
              {data.periods.length === 0 && (
                <option value={data.periode}>{formatPeriod(data.periode)}</option>
              )}
            </select>
          </label>
        }
      />

      {/* Hero Sambutan Ringkas & Personal */}
      <section className="welcome-banner compact">
        <div className="welcome-copy">
          <span className="eyebrow">PUSAT KEPUTUSAN SPK KIKOST</span>
          <h2>
            Selamat Datang, <em>{user?.nama || 'Pengguna'}!</em>
          </h2>
          <p>
            Sistem evaluasi kinerja vendor laundry berbasis Simple Additive Weighting (SAW).
            Pantau transparansi perangkingan dan kelengkapan kriteria operasional.
          </p>
          <div className="welcome-meta-chips">
            <span className="welcome-chip">
              Periode Sistem: <strong>{formatPeriod(data.periode)}</strong>
            </span>
            <span className="welcome-chip">
              Kelengkapan: <strong>{pct}% ({c.filled}/{c.expected})</strong>
            </span>
            <LinkButton
              to={`/penilaian/index.php?periode=${encodeURIComponent(data.periode)}`}
              variant="btn-white btn-small"
            >
              Buka Penilaian Vendor →
            </LinkButton>
          </div>
        </div>
        <div className="hero-orbit compact-orbit">
          <span className="orbit-ring ring-one" />
          <span className="orbit-ring ring-two" />
          <span className="orbit-core">🧺</span>
          <span className="orbit-tag">SAW</span>
        </div>
      </section>

      {/* 6 Kartu Metrik Faktual */}
      <div className="metric-grid six">
        <Metric
          icon="▣"
          label="Total Vendor"
          value={m.total_vendors}
          hint="Semua alternatif terdaftar"
          tone="blue"
        />
        <Metric
          icon="◉"
          label="Vendor Aktif"
          value={m.active_vendors}
          hint="Mitra operasional aktif"
          tone="teal"
        />
        <Metric
          icon="◈"
          label="Jumlah Kriteria"
          value={m.criteria_count}
          hint="Kriteria evaluasi SAW"
          tone="purple"
        />
        <Metric
          icon="⚖"
          label="Total Bobot"
          value={`${Number(m.weight_total).toFixed(1)}%`}
          hint={m.weight_valid ? 'Status: Valid 100%' : 'Perlu Penyesuaian'}
          tone={m.weight_valid ? 'green' : 'amber'}
        />
        <Metric
          icon="✓"
          label="Alternatif Lengkap"
          value={`${m.complete_vendors}/${m.active_vendors}`}
          hint="Semua kriteria terisi"
          tone={m.complete_vendors === m.active_vendors && m.active_vendors > 0 ? 'green' : 'blue'}
        />
        <Metric
          icon="♛"
          label="Juara Periode"
          value={m.ranking_winner || '—'}
          hint={m.ranking_score !== null ? `Vi: ${Number(m.ranking_score).toFixed(4)}` : 'Belum terhitung'}
          tone="gold"
          isText={true}
        />
      </div>

      {/* Dua Panel Grafik */}
      <div className="dashboard-charts-grid">
        <Card
          title="Perbandingan Nilai Preferensi (Vi)"
          action={<span className="period-chip">SAW {formatPeriod(data.periode)}</span>}
        >
          <p className="card-subhead">
            Nilai preferensi hasil normalisasi dan pembobotan SAW per vendor aktif.
          </p>
          <ViBarChart
            ranking={data.ranking}
            period={data.periode}
            onAction={() => navigate(`/penilaian/index.php?periode=${encodeURIComponent(data.periode)}`)}
          />
        </Card>

        <Card
          title="Komposisi Bobot Kriteria"
          action={
            <span className={`status-pill ${m.weight_valid ? 'pill-success' : 'pill-warning'}`}>
              {m.weight_valid ? 'Valid 100%' : 'Belum Valid'}
            </span>
          }
        >
          <p className="card-subhead">
            Proporsi bobot kriteria yang menjadi dasar pembobotan matriks ternormalisasi.
          </p>
          <CriteriaDonutChart
            criteria={data.criteria}
            weightTotal={Number(m.weight_total)}
            weightValid={m.weight_valid}
          />
        </Card>
      </div>

      {/* Area Bawah: Ranking 5 Besar & Panel Kelengkapan / Waktu Faktual */}
      <div className="dashboard-bottom-grid">
        <Card
          title="Peringkat 5 Besar Vendor"
          action={
            <LinkButton
              to={`/saw/ranking.php?periode=${encodeURIComponent(data.periode)}`}
              variant="btn-text"
            >
              Lihat semua hasil ranking <span>→</span>
            </LinkButton>
          }
        >
          {hasRanking ? (
            <Table
              headers={['Posisi', 'Nama Vendor', 'Skor Preferensi (Vi)', 'Status']}
              empty="Belum ada vendor dengan penilaian lengkap."
            >
              {data.ranking.map((item, index) => {
                const vi = Number(item.nilai_akhir) || 0;
                const pctVi = Math.max(0, Math.min(100, vi * 100));
                let rankClass = 'rank-number';
                let rankLabel = String(index + 1).padStart(2, '0');
                let statusBadge = <span className="status-pill pill-muted">Peringkat {index + 1}</span>;

                if (index === 0) {
                  rankClass = 'rank-number rank-gold';
                  rankLabel = '🥇 1';
                  statusBadge = <span className="status-pill pill-gold">Juara 1</span>;
                } else if (index === 1) {
                  rankClass = 'rank-number rank-silver';
                  rankLabel = '🥈 2';
                  statusBadge = <span className="status-pill pill-silver">Peringkat 2</span>;
                } else if (index === 2) {
                  rankClass = 'rank-number rank-bronze';
                  rankLabel = '🥉 3';
                  statusBadge = <span className="status-pill pill-bronze">Peringkat 3</span>;
                }

                return (
                  <tr key={item.vendor_id || index}>
                    <td>
                      <span className={rankClass}>{rankLabel}</span>
                    </td>
                    <td>
                      <b>{item.nama_vendor}</b>
                      <small className="table-sub">Periode {formatPeriod(data.periode)}</small>
                    </td>
                    <td>
                      <div className="score-cell">
                        <b className="score-value">{vi.toFixed(4)}</b>
                        <div className="score-mini-track">
                          <span style={{ width: `${pctVi}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>{statusBadge}</td>
                  </tr>
                );
              })}
            </Table>
          ) : (
            <Empty icon="♛">
              Belum ada ranking untuk periode ini. Pastikan bobot kriteria telah valid 100% dan seluruh kriteria vendor telah dinilai.
            </Empty>
          )}
        </Card>

        {/* Panel Kelengkapan & Log Waktu Faktual */}
        <Card
          title="Status Evaluasi & Sistem"
          action={<span className="period-chip">{formatPeriod(data.periode)}</span>}
        >
          <div className="summary-section">
            <h3 className="summary-heading">Kelengkapan Penilaian Periode Ini</h3>
            <div className="completion-row">
              <div className="completion-number">
                {pct}
                <small>%</small>
              </div>
              <div>
                <b>{c.filled} dari {c.expected}</b>
                <span>nilai kriteria telah tercatat</span>
              </div>
            </div>
            <div className="progress-track">
              <span style={{ width: `${pct}%` }} />
            </div>
            <div className="completion-legend">
              <span>{c.filled} terisi</span>
              <span>{Math.max(0, c.expected - c.filled)} belum terisi</span>
            </div>

            {c.vendors.some((v) => v.status !== 'lengkap') ? (
              <div className="incomplete-list">
                {c.vendors
                  .filter((v) => v.status !== 'lengkap')
                  .slice(0, 4)
                  .map((v) => (
                    <div className="incomplete-row" key={v.id}>
                      <span className="status-dot" />
                      <div>
                        <b>{v.nama_vendor}</b>
                        <small>
                          {v.terisi}/{v.total} kriteria · kosong: {v.missing.map((x) => x.kode).join(', ') || '—'}
                        </small>
                      </div>
                      <LinkButton
                        to={`/penilaian/${v.terisi ? 'edit.php' : 'input.php'}?vendor_id=${v.id}&periode=${encodeURIComponent(data.periode)}`}
                        variant="btn-small"
                      >
                        Lengkapi
                      </LinkButton>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="notice notice-success">
                ✓ Seluruh vendor aktif telah memiliki penilaian lengkap pada periode ini.
              </div>
            )}
          </div>

          <div className="summary-divider" />

          {/* Bagian B: Informasi Waktu Faktual Sistem */}
          <div className="summary-section">
            <h3 className="summary-heading">Stempel Waktu Faktual Sistem</h3>
            <p className="summary-subnote">
              Data riil dari database (bukan log aktivitas rekayasa):
            </p>
            <div className="factual-time-list">
              <div className="factual-time-row">
                <span className="factual-time-icon">👤</span>
                <div>
                  <small>Login akun saat ini</small>
                  <b>{formatDate(data.activity?.last_login)}</b>
                </div>
              </div>
              <div className="factual-time-row">
                <span className="factual-time-icon">🧺</span>
                <div>
                  <small>Pendaftaran vendor terakhir</small>
                  <b>{formatDate(data.activity?.latest_vendor)}</b>
                </div>
              </div>
              <div className="factual-time-row">
                <span className="factual-time-icon">📝</span>
                <div>
                  <small>Entri penilaian terakhir periode ini</small>
                  <b>{formatDate(data.activity?.latest_assessment)}</b>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function Metric({ icon, label, value, hint, tone, isText = false }) {
  const isStringVal = typeof value === 'string';
  const autoText = isText || (isStringVal && value.length > 10);
  return (
    <div
      className={`metric-card ${autoText ? 'metric-card-text' : ''}`}
      tabIndex={autoText ? 0 : undefined}
      title={isStringVal && value !== '—' ? `${label}: ${value}` : undefined}
      role={autoText ? 'group' : undefined}
      aria-label={isStringVal && value !== '—' ? `${label}: ${value}` : undefined}
    >
      <div className={`metric-icon tone-${tone}`}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
      <span className="metric-spark">↗</span>
    </div>
  );
}

function VendorsPage({ route, navigate, notify }) {
  const id = Number(route.query.get('id') || 0); const isDetail = route.path.endsWith('/detail.php');
  const [rows, setRows] = useState(null); const [detail, setDetail] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('default');
  const [error, setError] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => { let alive = true; setRows(null); if (isDetail && id) get('vendors', { id }).then((d) => alive && setDetail(d)).catch((e) => alive && setError(e)); else get('vendors').then((d) => alive && setRows(Array.isArray(d) ? d : (d?.vendors || []))).catch((e) => alive && setError(e)); return () => { alive = false; }; }, [isDetail, id]);
  if (error) return <><PageHeading title="Data Vendor" /><ErrorMessage error={error} /></>;
  if (isDetail) {
    if (!detail) return <Loading />;
    return <><PageHeading title={detail.vendor.nama_vendor} subtitle="Profil vendor dan riwayat evaluasi." action={<div className="detail-actions-group"><LinkButton to="/vendors/index.php">← Kembali</LinkButton><LinkButton to={`/vendors/edit.php?id=${detail.vendor.id}`} variant="btn-primary">Edit vendor</LinkButton></div>} />
      <div className="metric-grid three"><Metric icon="▣" label="Status vendor" value={detail.vendor.status === 'aktif' ? 'Aktif' : 'Nonaktif'} hint="Status operasional saat ini" tone="green" /><Metric icon="☎" label="Telepon" value={detail.vendor.no_telepon || '—'} hint="Kontak vendor" tone="blue" /><Metric icon="⌖" label="Bergabung" value={String(detail.vendor.created_at || '—').slice(0, 10)} hint="Tanggal tercatat" tone="purple" /></div>
      <Card title="Alamat dan kontak"><p className="detail-text">{detail.vendor.alamat || 'Alamat belum dicatat.'}</p></Card>
      <Card title="Riwayat penilaian"><Table headers={['Periode', 'Kode', 'Kriteria', 'Jenis', 'Nilai']} empty="Belum ada riwayat penilaian.">{(detail.history || []).map((row, i) => <tr key={`${row.periode}-${row.kode}-${i}`}><td>{formatPeriod(row.periode)}</td><td><b>{row.kode}</b></td><td>{row.nama_kriteria}</td><td>{row.jenis}</td><td>{row.nilai}</td></tr>)}</Table></Card>
    </>;
  }
  if (!rows) return <Loading />;

  const totalCount = rows.length;
  const activeCount = rows.filter((r) => r.status === 'aktif').length;
  const inactiveCount = totalCount - activeCount;

  let filtered = rows.filter((row) => {
    const matchQuery = `${row.nama_vendor} ${row.alamat || ''} ${row.no_telepon || ''}`.toLowerCase().includes(query.toLowerCase());
    const matchStatus = statusFilter === 'all' ? true : (statusFilter === 'aktif' ? row.status === 'aktif' : row.status !== 'aktif');
    return matchQuery && matchStatus;
  });

  if (sortKey === 'name-asc') {
    filtered = [...filtered].sort((a, b) => a.nama_vendor.localeCompare(b.nama_vendor));
  } else if (sortKey === 'name-desc') {
    filtered = [...filtered].sort((a, b) => b.nama_vendor.localeCompare(a.nama_vendor));
  } else if (sortKey === 'date-desc') {
    filtered = [...filtered].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  } else if (sortKey === 'date-asc') {
    filtered = [...filtered].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
  }

  function handleRemove(row) {
    setConfirmState({
      title: 'Hapus Vendor',
      message: `Hapus ${row.nama_vendor} beserta seluruh riwayat penilaiannya? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus Vendor',
      danger: true,
      onConfirm: async () => {
        try {
          await post('vendors', 'delete', { id: row.id });
          setRows((current) => current.filter((item) => item.id !== row.id));
          notify('Vendor dan penilaian terkait dihapus.');
        } catch (e) {
          setError(e);
        }
      },
    });
  }

  return <><PageHeading title="Data Vendor" subtitle="Kelola mitra laundry yang menjadi alternatif penilaian." action={<LinkButton to="/vendors/create.php" variant="btn-primary">＋ Tambah vendor</LinkButton>} />
    <Card
      title={`${filtered.length} dari ${rows.length} vendor`}
      action={
        <div className="table-toolbar-actions">
          <div className="filter-pill-group" role="tablist" aria-label="Filter status vendor">
            <button type="button" role="tab" aria-selected={statusFilter === 'all'} className={`filter-pill-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>Semua ({totalCount})</button>
            <button type="button" role="tab" aria-selected={statusFilter === 'aktif'} className={`filter-pill-btn ${statusFilter === 'aktif' ? 'active' : ''}`} onClick={() => setStatusFilter('aktif')}>Aktif ({activeCount})</button>
            <button type="button" role="tab" aria-selected={statusFilter === 'inactive'} className={`filter-pill-btn ${statusFilter === 'inactive' ? 'active' : ''}`} onClick={() => setStatusFilter('inactive')}>Nonaktif ({inactiveCount})</button>
          </div>
          <select className="sort-select" value={sortKey} onChange={(e) => setSortKey(e.target.value)} aria-label="Urutkan data vendor">
            <option value="default">Urutan Terdaftar</option>
            <option value="name-asc">Nama (A–Z)</option>
            <option value="name-desc">Nama (Z–A)</option>
            <option value="date-desc">Terbaru Ditambahkan</option>
            <option value="date-asc">Terlama Ditambahkan</option>
          </select>
          <input className="search-input" placeholder="Cari vendor, alamat, telepon…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cari vendor" />
        </div>
      }
    >
      <ErrorMessage error={error} />
      <Table
        headers={['Vendor', 'Kontak', 'Status', 'Dibuat', 'Aksi']}
        empty={
          query || statusFilter !== 'all' ? (
            <div className="empty-search-state">
              <p>Tidak ada vendor yang cocok dengan filter atau pencarian.</p>
              <button
                type="button"
                className="btn btn-light btn-small"
                onClick={() => { setQuery(''); setStatusFilter('all'); }}
              >
                ↺ Reset Filter & Pencarian
              </button>
            </div>
          ) : (
            'Belum ada data vendor.'
          )
        }
      >
        {filtered.map((row) => (
          <tr key={row.id}>
            <td>
              <b>{row.nama_vendor}</b>
              <small className="table-sub table-address-wrap">{row.alamat || 'Alamat belum dicatat'}</small>
            </td>
            <td>{row.no_telepon || '—'}</td>
            <td><span className={`status-pill ${row.status === 'aktif' ? 'pill-success' : 'pill-muted'}`}>{row.status}</span></td>
            <td>{String(row.created_at || '—').slice(0, 10)}</td>
            <td className="actions actions-3">
              <LinkButton to={`/vendors/detail.php?id=${row.id}`} variant="btn-icon" aria-label={`Lihat detail ${row.nama_vendor}`}>Lihat</LinkButton>
              <LinkButton to={`/vendors/edit.php?id=${row.id}`} variant="btn-icon" aria-label={`Edit ${row.nama_vendor}`}>Edit</LinkButton>
              <Button variant="btn-icon btn-danger-soft" onClick={() => handleRemove(row)} aria-label={`Hapus ${row.nama_vendor}`}>Hapus</Button>
            </td>
          </tr>
        ))}
      </Table>
    </Card>
    <ConfirmModal
      isOpen={!!confirmState}
      title={confirmState?.title}
      message={confirmState?.message}
      confirmText={confirmState?.confirmText}
      danger={confirmState?.danger}
      onConfirm={() => { const act = confirmState?.onConfirm; setConfirmState(null); act?.(); }}
      onCancel={() => setConfirmState(null)}
    />
  </>;
}

function VendorForm({ route, navigate, notify }) {
  const id = Number(route.query.get('id') || 0); const editing = route.path.endsWith('/edit.php');
  const [form, setForm] = useState({ nama_vendor: '', alamat: '', no_telepon: '', status: 'aktif' }); const [loading, setLoading] = useState(editing); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!editing) return; let alive = true; get('vendors', { id }).then((r) => alive && setForm(r.vendor)).catch(setError).finally(() => alive && setLoading(false)); return () => { alive = false; }; }, [editing, id]);
  async function submit(e) { e.preventDefault(); setBusy(true); setError(null); try { await post('vendors', editing ? 'update' : 'create', { ...form, ...(editing ? { id } : {}) }); notify(editing ? 'Data vendor diperbarui.' : 'Vendor ditambahkan.'); navigate('/vendors/index.php'); } catch (err) { setError(err); } finally { setBusy(false); } }
  if (loading) return <Loading />;
  const fe = fieldErrors(error);
  return <><PageHeading title={editing ? 'Edit Vendor' : 'Tambah Vendor'} subtitle="Informasi ini digunakan untuk mengelola alternatif laundry." action={<LinkButton to="/vendors/index.php">← Kembali</LinkButton>} /><Card title="Informasi vendor" className="form-card"><ErrorMessage error={error} /><form onSubmit={submit} className="form-stack"><TextField label="Nama vendor *" value={form.nama_vendor} onChange={(v) => setForm({ ...form, nama_vendor: v })} maxLength={100} error={fe.nama_vendor} required /><TextField label="Nomor telepon" value={form.no_telepon} onChange={(v) => setForm({ ...form, no_telepon: v })} /><label className="field"><span>Alamat</span><textarea rows="4" value={form.alamat || ''} onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></label><SelectField label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} error={fe.status}><option value="aktif">Aktif</option><option value="tidak aktif">Tidak aktif</option></SelectField><div className="form-actions"><Button variant="btn-primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan vendor'}</Button><LinkButton to="/vendors/index.php">Batal</LinkButton></div></form></Card></>;
}

function CriteriaPage({ user, route, navigate, notify }) {
  const readOnly = user.role !== 'superadmin';
  const [rows, setRows] = useState(null);
  const [sortKey, setSortKey] = useState('kode');
  const [error, setError] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => { let alive = true; get('criteria').then((r) => alive && setRows(r)).catch(setError); return () => { alive = false; }; }, []);

  function handleRemove(row) {
    setConfirmState({
      title: 'Hapus Kriteria',
      message: `Hapus kriteria ${row.kode} (${row.nama_kriteria})? Semua nilai kriteria ini pada seluruh periode historis akan ikut terhapus.`,
      confirmText: 'Hapus Kriteria',
      danger: true,
      onConfirm: async () => {
        try {
          await post('criteria', 'delete', { id: row.id });
          setRows((current) => current.filter((item) => item.id !== row.id));
          notify('Kriteria dihapus.');
        } catch (e) {
          setError(e);
        }
      },
    });
  }

  if (error) return <><PageHeading title="Kriteria & Bobot" /><ErrorMessage error={error} /></>;
  if (!rows) return <Loading />;
  const total = rows.reduce((sum, row) => sum + Number(row.bobot), 0);

  let sortedRows = [...rows];
  if (sortKey === 'kode') sortedRows.sort((a, b) => a.kode.localeCompare(b.kode));
  else if (sortKey === 'bobot-desc') sortedRows.sort((a, b) => Number(b.bobot) - Number(a.bobot));
  else if (sortKey === 'bobot-asc') sortedRows.sort((a, b) => Number(a.bobot) - Number(b.bobot));
  else if (sortKey === 'name') sortedRows.sort((a, b) => a.nama_kriteria.localeCompare(b.nama_kriteria));

  return <><PageHeading title="Kriteria & Bobot" subtitle={readOnly ? 'Daftar kriteria dan bobot yang berlaku.' : 'Atur kriteria dan bobot dasar perhitungan SAW.'} action={!readOnly && <><LinkButton to="/kriterias/bobot.php" variant="btn-light">Atur bobot</LinkButton><LinkButton to="/kriterias/create.php" variant="btn-primary">＋ Tambah kriteria</LinkButton></>} />
    <div className={`notice ${Math.abs(total - 100) < 0.01 ? 'notice-success' : 'notice-warn'}`}>Total bobot saat ini <b>{total.toFixed(2)}%</b> {Math.abs(total - 100) < 0.01 ? '— valid.' : '— perlu disesuaikan menjadi 100%.'}</div>
    <Card
      title={`${rows.length} kriteria`}
      action={
        <select className="sort-select" value={sortKey} onChange={(e) => setSortKey(e.target.value)} aria-label="Urutkan kriteria">
          <option value="kode">Urutan Kode (C1–Cn)</option>
          <option value="bobot-desc">Bobot Tertinggi</option>
          <option value="bobot-asc">Bobot Terendah</option>
          <option value="name">Nama Kriteria (A–Z)</option>
        </select>
      }
    >
      <ErrorMessage error={error} />
      <Table headers={['Kode', 'Kriteria', 'Jenis', 'Bobot (%)', ...(!readOnly ? ['Aksi'] : [])]}>
        {sortedRows.map((row) => (
          <tr key={row.id}>
            <td><span className="criterion-code">{row.kode}</span></td>
            <td><b style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.nama_kriteria}</b></td>
            <td><span className={`type-chip ${row.jenis}`}>{row.jenis}</span></td>
            <td>
              <div className="weight-cell">
                <b>{Number(row.bobot).toFixed(2)}%</b>
                <div className="weight-mini-track" title={`Bobot ${row.kode}: ${Number(row.bobot).toFixed(2)}%`}>
                  <span style={{ width: `${Math.max(0, Math.min(100, Number(row.bobot)))}%` }} />
                </div>
              </div>
            </td>
            {!readOnly && (
              <td className="actions actions-2">
                <LinkButton to={`/kriterias/edit.php?id=${row.id}`} variant="btn-icon" aria-label={`Edit ${row.kode}`}>Edit</LinkButton>
                <Button variant="btn-icon btn-danger-soft" onClick={() => handleRemove(row)} aria-label={`Hapus ${row.kode}`}>Hapus</Button>
              </td>
            )}
          </tr>
        ))}
      </Table>
    </Card>
    <ConfirmModal
      isOpen={!!confirmState}
      title={confirmState?.title}
      message={confirmState?.message}
      confirmText={confirmState?.confirmText}
      danger={confirmState?.danger}
      onConfirm={() => { const act = confirmState?.onConfirm; setConfirmState(null); act?.(); }}
      onCancel={() => setConfirmState(null)}
    />
  </>;
}

function CriterionForm({ route, navigate, notify }) {
  const id = Number(route.query.get('id') || 0); const editing = route.path.endsWith('/edit.php');
  const [form, setForm] = useState({ kode: '', nama_kriteria: '', bobot: '', jenis: 'benefit' }); const [rows, setRows] = useState(null); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { let alive = true; get('criteria').then((list) => { if (!alive) return; setRows(list); if (editing) { const row = list.find((item) => Number(item.id) === id); if (!row) setError(new Error('Kriteria tidak ditemukan.')); else setForm(row); } }).catch(setError); return () => { alive = false; }; }, [editing, id]);
  if (!rows) return <Loading />;
  const fe = fieldErrors(error);
  async function submit(e) { e.preventDefault(); setBusy(true); setError(null); try { await post('criteria', editing ? 'update' : 'create', { ...form, ...(editing ? { id } : {}) }); notify(editing ? 'Kriteria diperbarui.' : 'Kriteria ditambahkan.'); navigate('/kriterias/index.php'); } catch (err) { setError(err); } finally { setBusy(false); } }
  return <><PageHeading title={editing ? 'Edit Kriteria' : 'Tambah Kriteria'} subtitle="Definisikan kode, nama, bobot awal, dan sifat kriteria." action={<LinkButton to="/kriterias/index.php">← Kembali</LinkButton>} /><Card title="Data kriteria" className="form-card"><ErrorMessage error={error} /><form onSubmit={submit} className="form-stack"><TextField label="Kode *" value={form.kode} onChange={(v) => setForm({ ...form, kode: v.toUpperCase() })} placeholder="C9" error={fe.kode} required /><TextField label="Nama kriteria *" value={form.nama_kriteria} onChange={(v) => setForm({ ...form, nama_kriteria: v })} error={fe.nama_kriteria} required /><TextField label="Bobot (%) *" type="number" min="0.01" max="100" step="0.01" value={form.bobot} onChange={(v) => setForm({ ...form, bobot: v })} error={fe.bobot} required /><div><SelectField label="Jenis *" value={form.jenis} onChange={(v) => setForm({ ...form, jenis: v })} error={fe.jenis}><option value="benefit">Benefit</option><option value="cost">Cost</option></SelectField><small className="field-hint">{form.jenis === 'benefit' ? '✓ Sifat Benefit: Kriteria yang semakin tinggi nilainya semakin menguntungkan (contoh: Kualitas, Ketepatan Waktu).' : '✓ Sifat Cost: Kriteria biaya atau waktu di mana semakin rendah nilainya justru semakin baik (contoh: Harga, Waktu Pengerjaan).'}</small></div><div className="form-actions"><Button variant="btn-primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan kriteria'}</Button><LinkButton to="/kriterias/index.php">Batal</LinkButton></div></form></Card></>;
}

function WeightPage({ navigate, notify }) {
  const [rows, setRows] = useState(null); const [weights, setWeights] = useState({}); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { let alive = true; get('criteria').then((items) => { if (!alive) return; setRows(items); setWeights(Object.fromEntries(items.map((item) => [item.id, String(item.bobot)]))); }).catch(setError); return () => { alive = false; }; }, []);
  if (!rows) return <Loading />;
  const total = Object.values(weights).reduce((sum, item) => sum + (Number(item) || 0), 0);
  async function submit(e) { e.preventDefault(); setBusy(true); setError(null); try { await post('criteria', 'weights', { weights }); notify('Bobot kriteria berhasil disimpan.'); navigate('/kriterias/index.php'); } catch (err) { setError(err); } finally { setBusy(false); } }
  return <><PageHeading title="Atur Bobot" subtitle="Jumlah bobot harus tepat 100% dan setiap kriteria harus lebih dari 0%." action={<LinkButton to="/kriterias/index.php">← Kembali</LinkButton>} /><Card title="Distribusi bobot" className="form-card"><ErrorMessage error={error} /><form onSubmit={submit}><div className="weight-form-list">{rows.map((row) => <label className="weight-form-row" key={row.id}><span className="criterion-code">{row.kode}</span><span><b>{row.nama_kriteria}</b><small>{row.jenis}</small></span><div><input type="number" min="0.01" max="100" step="0.01" value={weights[row.id] || ''} onChange={(e) => setWeights({ ...weights, [row.id]: e.target.value })} /><b>%</b></div></label>)}</div><div className={`weight-total ${Math.abs(total - 100) < 0.01 ? 'total-valid' : 'total-invalid'}`}><span>Total bobot</span><strong>{total.toFixed(2)}%</strong></div><div className="form-actions"><Button variant="btn-primary" disabled={busy || Math.abs(total - 100) >= 0.01}>{busy ? 'Menyimpan…' : 'Simpan bobot'}</Button></div></form></Card></>;
}

const SCALE_1_TO_5_CRITERIA = new Set(['C2', 'C4', 'C5', 'C6', 'C7', 'C8']);
const SCALE_LABELS = {
  1: 'Sangat Buruk',
  2: 'Buruk',
  3: 'Cukup',
  4: 'Baik',
  5: 'Sangat Baik',
};

function RatingSelector({ criterion, value, onChange, error }) {
  const currentVal = Number(value) || 0;
  return (
    <div className={`rating-selector-card ${error ? 'invalid' : ''}`}>
      <div className="rating-selector-header">
        <div>
          <span className="criterion-code">{criterion.kode}</span>
          <strong className="rating-crit-name">{criterion.nama_kriteria}</strong>
          <span className={`type-chip type-chip-xs ${criterion.jenis}`}>{criterion.jenis}</span>
        </div>
        <span className="rating-current-label">
          {currentVal >= 1 && currentVal <= 5 ? (
            <b>{currentVal} · {SCALE_LABELS[currentVal]}</b>
          ) : (
            <em className="text-muted">Pilih nilai (1–5)</em>
          )}
        </span>
      </div>
      <div className="rating-pill-group" role="radiogroup" aria-label={`Pilih skala nilai untuk ${criterion.kode} ${criterion.nama_kriteria}`}>
        {[1, 2, 3, 4, 5].map((score) => {
          const isSelected = currentVal === score;
          return (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`rating-pill-btn ${isSelected ? 'active' : ''}`}
              onClick={() => onChange(String(score))}
            >
              <span className="rating-score-num">{score}</span>
              <span className="rating-score-text">{SCALE_LABELS[score]}</span>
            </button>
          );
        })}
      </div>
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}

function AssessmentsPage({ route, navigate, notify }) {
  const period = route.query.get('periode') || '';
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterIncompleteOnly, setFilterIncompleteOnly] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    get('assessments', period ? { periode: period } : {})
      .then((r) => alive && setData(r))
      .catch(setError);
    return () => { alive = false; };
  }, [period]);

  if (error) return <><PageHeading title="Penilaian Vendor" /><ErrorMessage error={error} /></>;
  if (!data) return <Loading />;

  function handleRemove(row) {
    setConfirmState({
      title: 'Hapus Penilaian',
      message: `Hapus penilaian ${row.vendor.nama_vendor} periode ${formatPeriod(data.periode)}? Seluruh nilai kriteria vendor ini pada periode terpilih akan dihapus.`,
      confirmText: 'Hapus Penilaian',
      danger: true,
      onConfirm: async () => {
        try {
          await post('assessments', 'delete', { vendor_id: row.vendor.id, periode: data.periode });
          setData((current) => ({ ...current, rows: current.rows.filter((r) => Number(r.vendor.id) !== Number(row.vendor.id)) }));
          notify('Penilaian dihapus.');
        } catch (e) { setError(e); }
      },
    });
  }

  const rowsList = Array.isArray(data?.rows) ? data.rows : [];
  const scoredIds = new Set(rowsList.map((r) => Number(r.vendor?.id || r.vendor_id)));
  const incompleteCount = rowsList.filter((r) => (r.filled || 0) < (r.total || 0)).length;

  let filteredRows = rowsList;
  if (filterIncompleteOnly) {
    filteredRows = filteredRows.filter((r) => (r.filled || 0) < (r.total || 0));
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredRows = filteredRows.filter((r) => r.vendor.nama_vendor.toLowerCase().includes(q));
  }

  const matrixHeaders = [
    <th key="th-vendor" style={{ minWidth: '160px' }}>Vendor</th>,
    ...data.criteria.map((c) => (
      <th key={`c-${c.id}`} className="matrix-th" title={`${c.kode} · ${c.nama_kriteria}`}>
        <span className="th-code">{c.kode}</span>
        <span className="th-name">{c.nama_kriteria}</span>
        <span className={`type-chip type-chip-xs ${c.jenis}`}>{c.jenis}</span>
      </th>
    )),
    <th key="th-status" className="text-center" style={{ minWidth: '100px' }}>Kelengkapan</th>,
    <th key="th-actions" className="text-center" style={{ minWidth: '140px' }}>Aksi</th>,
  ];

  return <>
    <PageHeading
      title="Penilaian Vendor"
      subtitle="Input dan tinjau nilai vendor berdasarkan kriteria evaluasi periode."
      action={
        <LinkButton to={`/penilaian/input.php?periode=${encodeURIComponent(data.periode)}`} variant="btn-primary">
          ＋ Input penilaian
        </LinkButton>
      }
    />
    <div className="toolbar-card">
      <label className="period-select">
        <span>Periode</span>
        <select value={data.periode} onChange={(e) => navigate(`/penilaian/index.php?periode=${encodeURIComponent(e.target.value)}`)}>
          {data.periods.map((p) => <option key={p} value={p}>{p}</option>)}
          {!data.periods.includes(data.periode) && <option value={data.periode}>{data.periode}</option>}
        </select>
      </label>
      <div className="table-toolbar-actions">
        <div className="filter-pill-group" role="tablist" aria-label="Filter kelengkapan penilaian">
          <button
            type="button"
            role="tab"
            aria-selected={!filterIncompleteOnly}
            className={`filter-pill-btn ${!filterIncompleteOnly ? 'active' : ''}`}
            onClick={() => setFilterIncompleteOnly(false)}
          >
            Semua ({data.rows.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterIncompleteOnly}
            className={`filter-pill-btn ${filterIncompleteOnly ? 'active' : ''}`}
            onClick={() => setFilterIncompleteOnly(true)}
            title="Saring hanya vendor dengan penilaian yang belum lengkap"
          >
            ⚠️ Belum Lengkap ({incompleteCount})
          </button>
        </div>
        <input
          className="search-input"
          placeholder="Cari vendor dinilai…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Cari vendor dalam matriks penilaian"
        />
        <span className="toolbar-note">{filteredRows.length} dari {data.rows.length} vendor ditampilkan</span>
      </div>
    </div>
    {data.vendors.filter((v) => !scoredIds.has(Number(v.id))).length > 0 && (
      <Card title="Belum Dinilai pada Periode Ini">
        <div className="vendor-pills">
          {data.vendors.filter((v) => !scoredIds.has(Number(v.id))).map((v) => (
            <LinkButton key={v.id} to={`/penilaian/input.php?vendor_id=${v.id}&periode=${encodeURIComponent(data.periode)}`} variant="btn-small">
              ＋ {v.nama_vendor}
            </LinkButton>
          ))}
        </div>
      </Card>
    )}
    <Card title="Matriks Penilaian Terinci">
      <ErrorMessage error={error} />
      <Table
        headers={matrixHeaders}
        className="table-sticky-first"
        empty={
          filterIncompleteOnly ? (
            <div className="empty-search-state">
              <p>✓ Seluruh vendor pada periode ini telah memiliki penilaian lengkap.</p>
              <button
                type="button"
                className="btn btn-light btn-small"
                onClick={() => setFilterIncompleteOnly(false)}
              >
                Tampilkan Semua Penilaian
              </button>
            </div>
          ) : searchQuery ? (
            <div className="empty-search-state">
              <p>Vendor tidak ditemukan dalam matriks penilaian periode ini.</p>
              <button
                type="button"
                className="btn btn-light btn-small"
                onClick={() => setSearchQuery('')}
              >
                Reset Pencarian
              </button>
            </div>
          ) : (
            'Belum ada penilaian untuk periode ini.'
          )
        }
      >
        {filteredRows.map((row) => (
          <tr key={row.vendor.id}>
            <td>
              <b>{row.vendor.nama_vendor}</b>
            </td>
            {data.criteria.map((c) => (
              <td key={c.id} className="text-center fw-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {row.ratings[c.id] ?? '—'}
              </td>
            ))}
            <td className="text-center">
              <span className={`status-pill ${row.filled === row.total ? 'pill-success' : 'pill-warning'}`}>
                {row.filled}/{row.total}
              </span>
            </td>
            <td className="actions actions-2">
              <LinkButton to={`/penilaian/edit.php?vendor_id=${row.vendor.id}&periode=${encodeURIComponent(data.periode)}`} variant="btn-icon" aria-label={`Edit nilai ${row.vendor.nama_vendor}`}>Edit</LinkButton>
              <Button variant="btn-icon btn-danger-soft" onClick={() => handleRemove(row)} aria-label={`Hapus nilai ${row.vendor.nama_vendor}`}>Hapus</Button>
            </td>
          </tr>
        ))}
      </Table>
    </Card>
    <ConfirmModal
      isOpen={!!confirmState}
      title={confirmState?.title}
      message={confirmState?.message}
      confirmText={confirmState?.confirmText}
      danger={confirmState?.danger}
      onConfirm={() => { const act = confirmState?.onConfirm; setConfirmState(null); act?.(); }}
      onCancel={() => setConfirmState(null)}
    />
  </>;
}

function AssessmentForm({ route, navigate, notify }) {
  const edit = route.path.endsWith('/edit.php'); const vendorId = Number(route.query.get('vendor_id') || 0); const periodFromUrl = route.query.get('periode') || '';
  const [data, setData] = useState(null); const [form, setForm] = useState({ vendor_id: vendorId, periode: periodFromUrl, nilai: {} }); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { let alive = true; const params = { ...(periodFromUrl ? { periode: periodFromUrl } : {}), ...(vendorId ? { vendor_id: vendorId } : {}) }; get('assessments', params).then((r) => { if (!alive) return; setData(r); const existing = r.rows.find((row) => Number(row.vendor.id) === vendorId); setForm({ vendor_id: vendorId || '', periode: periodFromUrl || r.periode, nilai: existing?.ratings || {} }); }).catch(setError); return () => { alive = false; }; }, [periodFromUrl, vendorId]);
  if (!data) return <Loading />;
  const fe = fieldErrors(error);
  async function submit(e) { e.preventDefault(); setBusy(true); setError(null); try { await post('assessments', edit ? 'update' : 'create', form); notify(edit ? 'Penilaian diperbarui.' : 'Penilaian disimpan.'); navigate(`/penilaian/index.php?periode=${encodeURIComponent(form.periode)}`); } catch (err) { setError(err); } finally { setBusy(false); } }
  return <><PageHeading title={edit ? 'Edit Penilaian' : 'Input Penilaian'} subtitle="Isi nilai untuk seluruh kriteria yang berlaku pada vendor ini." action={<LinkButton to={`/penilaian/index.php?periode=${encodeURIComponent(form.periode || data.periode)}`}>← Kembali</LinkButton>} /><Card title="Nilai vendor" className="form-card"><ErrorMessage error={error} /><form onSubmit={submit} className="form-stack"><SelectField label="Vendor *" value={form.vendor_id} onChange={(v) => setForm({ ...form, vendor_id: v })} disabled={edit} required><option value="">Pilih vendor</option>{data.vendors.map((v) => <option key={v.id} value={v.id}>{v.nama_vendor}</option>)}</SelectField><TextField label="Periode (YYYY-MM) *" type="month" value={form.periode} onChange={(v) => setForm({ ...form, periode: v })} disabled={edit} required />
    <div className="ratings-grid">
      {data.criteria.map((criterion) => {
        if (SCALE_1_TO_5_CRITERIA.has(criterion.kode)) {
          return (
            <RatingSelector
              key={criterion.id}
              criterion={criterion}
              value={form.nilai?.[criterion.id]}
              onChange={(val) => setForm({ ...form, nilai: { ...form.nilai, [criterion.id]: val } })}
              error={fe[criterion.id]}
            />
          );
        }
        if (criterion.kode === 'C1') {
          return (
            <div className={`field-quantitative ${fe[criterion.id] ? 'has-error' : ''}`} key={criterion.id}>
              <div className="field-quant-header">
                <div>
                  <span className="criterion-code">{criterion.kode}</span>
                  <strong>{criterion.nama_kriteria}</strong>
                  <span className="type-chip type-chip-xs cost">cost</span>
                </div>
                <span className="quant-unit-badge">Rupiah / kg</span>
              </div>
              <div className="quant-input-group">
                <span className="quant-prefix">Rp</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Contoh: 5000"
                  value={form.nilai?.[criterion.id] ?? ''}
                  onChange={(e) => setForm({ ...form, nilai: { ...form.nilai, [criterion.id]: e.target.value } })}
                  className={fe[criterion.id] ? 'invalid' : ''}
                  required
                />
              </div>
              <small className="quant-hint">Biaya cuci per kilogram dalam Rupiah (bilangan bulat &gt; 0).</small>
              {fe[criterion.id] && <small className="field-error">{fe[criterion.id]}</small>}
            </div>
          );
        }
        if (criterion.kode === 'C3') {
          return (
            <div className={`field-quantitative ${fe[criterion.id] ? 'has-error' : ''}`} key={criterion.id}>
              <div className="field-quant-header">
                <div>
                  <span className="criterion-code">{criterion.kode}</span>
                  <strong>{criterion.nama_kriteria}</strong>
                  <span className="type-chip type-chip-xs cost">cost</span>
                </div>
                <span className="quant-unit-badge">Hari kerja</span>
              </div>
              <div className="quant-input-group">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="Contoh: 2"
                  value={form.nilai?.[criterion.id] ?? ''}
                  onChange={(e) => setForm({ ...form, nilai: { ...form.nilai, [criterion.id]: e.target.value } })}
                  className={fe[criterion.id] ? 'invalid' : ''}
                  required
                />
                <span className="quant-suffix">Hari</span>
              </div>
              <small className="quant-hint">Lama pengerjaan dalam hari kerja (maks. 1 desimal).</small>
              {fe[criterion.id] && <small className="field-error">{fe[criterion.id]}</small>}
            </div>
          );
        }
        return (
          <TextField
            key={criterion.id}
            label={`${criterion.kode} · ${criterion.nama_kriteria}`}
            type="number"
            value={form.nilai?.[criterion.id] ?? ''}
            onChange={(v) => setForm({ ...form, nilai: { ...form.nilai, [criterion.id]: v } })}
            error={fe[criterion.id]}
            required
          />
        );
      })}
    </div>
    <div className="form-actions"><Button variant="btn-primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan penilaian'}</Button><LinkButton to={`/penilaian/index.php?periode=${encodeURIComponent(form.periode || data.periode)}`}>Batal</LinkButton></div></form></Card></>;
}

function SawPage({ route, navigate }) {
  const period = route.query.get('periode') || ''; const [data, setData] = useState(null); const [error, setError] = useState(null); const rankingOnly = route.path.endsWith('/ranking.php');
  useEffect(() => { let alive = true; setData(null); get('saw', period ? { periode: period } : {}).then((r) => alive && setData(r)).catch((e) => alive && setError(e)); return () => { alive = false; }; }, [period]);
  if (error) return <><PageHeading title={rankingOnly ? 'Hasil Ranking Vendor' : 'Perhitungan SAW'} /><ErrorMessage error={error} /></>;
  if (!data) return <Loading />;
  return <SawContent data={data} rankingOnly={rankingOnly} navigate={navigate} />;
}
function SawDetailModal({ vendor, period, onClose }) {
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleKeyDownTrap = (e) => {
    if (e.key === 'Tab') {
      const focusableEls = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableEls || focusableEls.length === 0) return;
      const firstEl = focusableEls[0];
      const lastEl = focusableEls[focusableEls.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
  };

  if (!vendor) return null;

  let rankBadge = `#${vendor.officialRank}`;
  if (vendor.officialRank === 1) rankBadge = '🥇 #1 (Juara 1)';
  else if (vendor.officialRank === 2) rankBadge = '🥈 #2 (Runner Up)';
  else if (vendor.officialRank === 3) rankBadge = '🥉 #3 (Peringkat 3)';

  return (
    <div
      className="saw-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDownTrap}
      role="dialog"
      aria-modal="true"
      aria-labelledby="saw-modal-title"
    >
      <div className="saw-modal-dialog" ref={modalRef}>
        <div className="saw-modal-header">
          <div>
            <h2 id="saw-modal-title" className="saw-modal-title">
              Rincian Perhitungan SAW — {vendor.nama_vendor}
            </h2>
            <p className="saw-modal-sub">
              Peringkat Resmi <strong>{rankBadge}</strong> · Periode {formatPeriod(period)}
            </p>
          </div>
          <button
            type="button"
            className="saw-modal-close"
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Tutup dialog rincian nilai"
          >
            ✕
          </button>
        </div>
        <div className="saw-modal-body">
          <Table headers={['Kriteria', 'Sifat', 'Bobot (W)', 'Nilai Asli (x)', 'Normalisasi (rij)', 'Kontribusi (W × rij)']}>
            {vendor.detail.map((d) => (
              <tr key={d.kode}>
                <td><b>{d.kode}</b> · {d.nama}</td>
                <td className="text-center">
                  <span className={`type-chip ${d.jenis === 'cost' ? 'chip-cost' : 'chip-benefit'}`}>
                    {d.jenis ? d.jenis.toUpperCase() : 'BENEFIT'}
                  </span>
                </td>
                <td className="text-center">{(Number(d.bobot) * 100).toFixed(2)}%</td>
                <td className="text-center">{d.nilai_asli}</td>
                <td className="text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>{Number(d.rij).toFixed(4)}</td>
                <td className="text-right fw-700" style={{ color: 'var(--kikost-purple-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {Number(d.kontribusi).toFixed(4)}
                </td>
              </tr>
            ))}
          </Table>
          <div className="modal-summary-box">
            <div className="summary-row">
              <span>Rumus SAW:</span>
              <code>Vi = Σ (Wj × rij)</code>
            </div>
            <div className="summary-row highlight">
              <span>Total Nilai Preferensi (Vi):</span>
              <strong className="score-total">{Number(vendor.nilai_akhir).toFixed(4)}</strong>
            </div>
            <p className="summary-note">
              Jumlah seluruh kontribusi kriteria menghasilkan nilai preferensi final <strong>{Number(vendor.nilai_akhir).toFixed(4)}</strong> (Peringkat Resmi <strong>#{vendor.officialRank}</strong>).
            </p>
          </div>
        </div>
        <div className="saw-modal-footer">
          <Button variant="btn-primary" onClick={onClose}>
            Tutup Rincian
          </Button>
        </div>
      </div>
    </div>
  );
}

function SawPodium({ ranking, period, onOpenDetail }) {
  if (!ranking || ranking.length === 0) return null;

  // Single winner (1 entry)
  if (ranking.length === 1) {
    const winner = ranking[0];
    return (
      <section className="ranking-podium-section" aria-label="Juara Tunggal SAW">
        <div className="podium-single-card">
          <article className="podium-card podium-card-1" aria-label={`Juara 1 Resmi: ${winner.nama_vendor}`}>
            <div className="podium-badge-wrap">
              <span className="podium-medal">🥇</span>
              <span className="podium-rank-tag">#1</span>
            </div>
            <h3 className="podium-vendor-name">{winner.nama_vendor}</h3>
            <div className="podium-score-wrap">
              <span className="podium-score-val">{Number(winner.nilai_akhir).toFixed(4)}</span>
              <span className="podium-score-label">Nilai Vi</span>
            </div>
            <span className="podium-status-pill pill-winner">Juara 1 Resmi · Nilai Tertinggi</span>
            <button
              type="button"
              className="btn btn-purple btn-small podium-btn"
              onClick={(e) => onOpenDetail(winner, e.currentTarget)}
              aria-label={`Rincian nilai ${winner.nama_vendor}`}
            >
              🔍 Rincian Nilai
            </button>
          </article>
        </div>
      </section>
    );
  }

  // Two vendors (2 entries)
  if (ranking.length === 2) {
    const [top1, top2] = ranking;
    return (
      <section className="ranking-podium-section" aria-label="Podium Peringkat Teratas SAW">
        <div className="podium-two-cards">
          <article className="podium-card podium-card-1" aria-label={`Peringkat 1: ${top1.nama_vendor}`}>
            <div className="podium-badge-wrap">
              <span className="podium-medal">🥇</span>
              <span className="podium-rank-tag">#1</span>
            </div>
            <h3 className="podium-vendor-name">{top1.nama_vendor}</h3>
            <div className="podium-score-wrap">
              <span className="podium-score-val">{Number(top1.nilai_akhir).toFixed(4)}</span>
              <span className="podium-score-label">Nilai Vi</span>
            </div>
            <span className="podium-status-pill pill-winner">Juara 1 Resmi</span>
            <button
              type="button"
              className="btn btn-purple btn-small podium-btn"
              onClick={(e) => onOpenDetail(top1, e.currentTarget)}
              aria-label={`Rincian nilai ${top1.nama_vendor}`}
            >
              🔍 Rincian Nilai
            </button>
          </article>

          <article className="podium-card podium-card-2" aria-label={`Peringkat 2: ${top2.nama_vendor}`}>
            <div className="podium-badge-wrap">
              <span className="podium-medal">🥈</span>
              <span className="podium-rank-tag">#2</span>
            </div>
            <h3 className="podium-vendor-name">{top2.nama_vendor}</h3>
            <div className="podium-score-wrap">
              <span className="podium-score-val">{Number(top2.nilai_akhir).toFixed(4)}</span>
              <span className="podium-score-label">Nilai Vi</span>
            </div>
            <span className="podium-status-pill pill-silver">Runner Up</span>
            <button
              type="button"
              className="btn btn-light btn-small podium-btn"
              onClick={(e) => onOpenDetail(top2, e.currentTarget)}
              aria-label={`Rincian nilai ${top2.nama_vendor}`}
            >
              🔍 Rincian Nilai
            </button>
          </article>
        </div>
      </section>
    );
  }

  // 3 or more vendors (standard podium)
  const top1 = ranking[0];
  const top2 = ranking[1];
  const top3 = ranking[2];

  return (
    <section className="ranking-podium-section" aria-label="Podium 3 Besar Hasil SAW">
      <div className="ranking-podium-grid">
        {/* DOM Order 1: Rank #1 (Juara 1), CSS order: 2 (center on desktop, row 1 on mobile) */}
        <article className="podium-card podium-card-1" aria-label={`Juara 1 Resmi: ${top1.nama_vendor}`}>
          <div className="podium-badge-wrap">
            <span className="podium-medal">🥇</span>
            <span className="podium-rank-tag">#1</span>
          </div>
          <h3 className="podium-vendor-name">{top1.nama_vendor}</h3>
          <div className="podium-score-wrap">
            <span className="podium-score-val">{Number(top1.nilai_akhir).toFixed(4)}</span>
            <span className="podium-score-label">Nilai Vi</span>
          </div>
          <span className="podium-status-pill pill-winner">Juara 1 Resmi · Nilai Tertinggi</span>
          <button
            type="button"
            className="btn btn-purple btn-small podium-btn"
            onClick={(e) => onOpenDetail(top1, e.currentTarget)}
            aria-label={`Rincian nilai ${top1.nama_vendor}`}
          >
            🔍 Rincian Nilai
          </button>
        </article>

        {/* DOM Order 2: Rank #2 (Runner Up), CSS order: 1 (left on desktop, row 2 col 1 on mobile) */}
        <article className="podium-card podium-card-2" aria-label={`Runner Up Resmi: ${top2.nama_vendor}`}>
          <div className="podium-badge-wrap">
            <span className="podium-medal">🥈</span>
            <span className="podium-rank-tag">#2</span>
          </div>
          <h3 className="podium-vendor-name">{top2.nama_vendor}</h3>
          <div className="podium-score-wrap">
            <span className="podium-score-val">{Number(top2.nilai_akhir).toFixed(4)}</span>
            <span className="podium-score-label">Nilai Vi</span>
          </div>
          <span className="podium-status-pill pill-silver">Runner Up</span>
          <button
            type="button"
            className="btn btn-light btn-small podium-btn"
            onClick={(e) => onOpenDetail(top2, e.currentTarget)}
            aria-label={`Rincian nilai ${top2.nama_vendor}`}
          >
            🔍 Rincian Nilai
          </button>
        </article>

        {/* DOM Order 3: Rank #3 (Peringkat 3), CSS order: 3 (right on desktop, row 2 col 2 on mobile) */}
        <article className="podium-card podium-card-3" aria-label={`Peringkat 3 Resmi: ${top3.nama_vendor}`}>
          <div className="podium-badge-wrap">
            <span className="podium-medal">🥉</span>
            <span className="podium-rank-tag">#3</span>
          </div>
          <h3 className="podium-vendor-name">{top3.nama_vendor}</h3>
          <div className="podium-score-wrap">
            <span className="podium-score-val">{Number(top3.nilai_akhir).toFixed(4)}</span>
            <span className="podium-score-label">Nilai Vi</span>
          </div>
          <span className="podium-status-pill pill-bronze">Peringkat 3</span>
          <button
            type="button"
            className="btn btn-light btn-small podium-btn"
            onClick={(e) => onOpenDetail(top3, e.currentTarget)}
            aria-label={`Rincian nilai ${top3.nama_vendor}`}
          >
            🔍 Rincian Nilai
          </button>
        </article>
      </div>
    </section>
  );
}

function SawCalculationSteps({ data }) {
  const { criteria, ranking, periode } = data;
  if (!ranking || ranking.length === 0) return null;

  const critSummary = useMemo(() => {
    const summary = {};
    criteria.forEach((c) => {
      const vals = ranking.map((r) => {
        const item = (r.detail || []).find((d) => d.kode === c.kode);
        return item ? Number(item.nilai_asli) : 0;
      });
      const maxVal = vals.length > 0 ? Math.max(...vals) : 0;
      const minVal = vals.length > 0 ? Math.min(...vals) : 0;
      summary[c.kode] = {
        max: maxVal,
        min: minVal,
        target: c.jenis === 'benefit' ? maxVal : minVal,
        targetLabel: c.jenis === 'benefit' ? `Max = ${maxVal}` : `Min = ${minVal}`,
      };
    });
    return summary;
  }, [criteria, ranking]);

  return (
    <div className="saw-steps-container">
      <Card title="Langkah 1: Matriks Bobot & Sifat Kriteria (Wj)">
        <p className="card-subhead">
          Penetapan bobot preferensi dan sifat kriteria yang menjadi acuan normalisasi dan pembobotan.
        </p>
        <Table headers={['Kode', 'Nama Kriteria', 'Sifat Kriteria', 'Bobot (%)', 'Bobot Desimal (Wj)']}>
          {criteria.map((c) => {
            const bobotNum = Number(c.bobot);
            const wj = bobotNum / 100;
            return (
              <tr key={c.id}>
                <td><span className="criterion-code">{c.kode}</span></td>
                <td><b>{c.nama_kriteria}</b></td>
                <td>
                  <span className={`type-chip ${c.jenis === 'cost' ? 'chip-cost' : 'chip-benefit'}`}>
                    {c.jenis.toUpperCase()}
                  </span>
                </td>
                <td className="text-center">{bobotNum.toFixed(2)}%</td>
                <td className="text-center fw-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {wj.toFixed(4)}
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <Card title="Langkah 2: Matriks Keputusan Asli (X)">
        <p className="card-subhead">
          Data penilaian faktual setiap alternatif vendor sebelum dilakukan proses normalisasi.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                {criteria.map((c) => (
                  <th key={c.id} className="text-center">
                    <span className="th-code">{c.kode}</span>
                    <small className="th-sub-type">{c.jenis}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map((row) => (
                <tr key={row.vendor_id}>
                  <td><b>{row.nama_vendor}</b></td>
                  {criteria.map((c) => {
                    const d = (row.detail || []).find((item) => item.kode === c.kode);
                    return (
                      <td key={c.id} className="text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {d ? d.nilai_asli : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="table-summary-row">
                <td><b>Nilai Rujukan (Max / Min)</b></td>
                {criteria.map((c) => (
                  <td key={c.id} className="text-center fw-700">
                    <span className={`ref-badge ${c.jenis === 'cost' ? 'ref-cost' : 'ref-benefit'}`}>
                      {critSummary[c.kode]?.targetLabel}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Langkah 3: Matriks Ternormalisasi (R)">
        <p className="card-subhead">
          Normalisasi nilai menggunakan rumus SAW: <code>rij = xij / max(xj)</code> untuk Benefit, dan <code>rij = min(xj) / xij</code> untuk Cost.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                {criteria.map((c) => (
                  <th key={c.id} className="text-center">
                    <span className="th-code">{c.kode}</span>
                    <small className="th-sub-type">r_{c.kode}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map((row) => (
                <tr key={row.vendor_id}>
                  <td><b>{row.nama_vendor}</b></td>
                  {criteria.map((c) => {
                    const d = (row.detail || []).find((item) => item.kode === c.kode);
                    return (
                      <td key={c.id} className="text-center fw-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {d ? Number(d.rij).toFixed(4) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Langkah 4: Matriks Terbobot (Wj × rij)">
        <p className="card-subhead">
          Kontribusi masing-masing kriteria terhadap nilai preferensi akhir setelah dikalikan bobot desimal Wj.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                {criteria.map((c) => (
                  <th key={c.id} className="text-center">
                    <span className="th-code">{c.kode}</span>
                    <small className="th-sub-type">W × r</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map((row) => (
                <tr key={row.vendor_id}>
                  <td><b>{row.nama_vendor}</b></td>
                  {criteria.map((c) => {
                    const d = (row.detail || []).find((item) => item.kode === c.kode);
                    return (
                      <td key={c.id} className="text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {d ? Number(d.kontribusi).toFixed(4) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Langkah 5: Nilai Akhir Preferensi (Vi) & Perangkingan">
        <p className="card-subhead">
          Akumulasi seluruh kontribusi terbobot menghasilkan nilai preferensi final <code>Vi = Σ(Wj × rij)</code>.
        </p>
        <Table headers={['Peringkat', 'Vendor', 'Rumus Akumulasi', 'Nilai Akhir (Vi)', 'Status']}>
          {ranking.map((row, idx) => {
            const vi = Number(row.nilai_akhir) || 0;
            let rankBadge = `#${idx + 1}`;
            let pillClass = 'pill-muted';
            if (idx === 0) {
              rankBadge = '🥇 Juara 1';
              pillClass = 'pill-gold';
            } else if (idx === 1) {
              rankBadge = '🥈 Peringkat 2';
              pillClass = 'pill-silver';
            } else if (idx === 2) {
              rankBadge = '🥉 Peringkat 3';
              pillClass = 'pill-bronze';
            }
            return (
              <tr key={row.vendor_id}>
                <td><span className={`rank-number ${idx === 0 ? 'rank-first' : idx === 1 ? 'rank-silver' : idx === 2 ? 'rank-bronze' : ''}`}>{idx + 1}</span></td>
                <td><b>{row.nama_vendor}</b></td>
                <td><code className="saw-calc-formula">Σ(W1..W{criteria.length})</code></td>
                <td><strong className="score-value">{vi.toFixed(4)}</strong></td>
                <td><span className={`status-pill ${pillClass}`}>{rankBadge}</span></td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}

function SawContent({ data, rankingOnly, navigate }) {
  const [activeModalVendor, setActiveModalVendor] = useState(null);
  const [sortKey, setSortKey] = useState('official'); // 'official', 'name-asc', 'name-desc'
  const triggerBtnRef = useRef(null);
  const title = rankingOnly ? 'Hasil Ranking Vendor' : 'Perhitungan SAW';

  // Attach official rank permanently based on the backend calculation order!
  // Backend hitungSAW() returns vendors sorted by nilai_akhir descending.
  const rankingWithOfficial = useMemo(() => {
    return (data.ranking || []).map((item, index) => ({
      ...item,
      officialRank: index + 1,
    }));
  }, [data.ranking]);

  // Max Vi score for relative percentage calculation
  const maxVi = useMemo(() => {
    if (!rankingWithOfficial.length) return 1;
    return Number(rankingWithOfficial[0].nilai_akhir) || 1;
  }, [rankingWithOfficial]);

  // Display sorting (only changes display order, NEVER changes officialRank)
  const displayRanking = useMemo(() => {
    if (sortKey === 'name-asc') {
      return [...rankingWithOfficial].sort((a, b) => a.nama_vendor.localeCompare(b.nama_vendor));
    }
    if (sortKey === 'name-desc') {
      return [...rankingWithOfficial].sort((a, b) => b.nama_vendor.localeCompare(a.nama_vendor));
    }
    return rankingWithOfficial;
  }, [rankingWithOfficial, sortKey]);

  const handleOpenDetail = (vendor, triggerEl) => {
    triggerBtnRef.current = triggerEl || document.activeElement;
    setActiveModalVendor(vendor);
  };

  const handleCloseModal = () => {
    setActiveModalVendor(null);
    setTimeout(() => {
      triggerBtnRef.current?.focus();
    }, 0);
  };

  return <>
    <PageHeading
      title={title}
      subtitle={rankingOnly ? 'Peringkat resmi vendor laundry berdasarkan metode Simple Additive Weighting (SAW).' : 'Transparansi perhitungan normalisasi dan kontribusi bobot setiap vendor.'}
      action={!rankingOnly && <LinkButton to={`/saw/ranking.php?periode=${encodeURIComponent(data.periode)}`} variant="btn-primary">Lihat ranking <span>→</span></LinkButton>}
    />
    <div className="toolbar-card">
      <label className="period-select">
        <span>Periode</span>
        <select value={data.periode} onChange={(e) => navigate(`${rankingOnly ? '/saw/ranking.php' : '/saw/index.php'}?periode=${encodeURIComponent(e.target.value)}`)}>
          {data.periods.map((p) => <option key={p} value={p}>{p}</option>)}
          {data.periode && !data.periods.includes(data.periode) && <option value={data.periode}>{data.periode}</option>}
        </select>
      </label>
      <span className={`status-pill ${data.bobot_valid ? 'pill-success' : 'pill-warning'}`}>
        Bobot {data.bobot_valid ? 'valid' : 'perlu disesuaikan'} · {Number(data.total_bobot).toFixed(2)}%
      </span>
    </div>
    {!data.bobot_valid && <div className="notice notice-warn">Total bobot harus 100% dan setiap kriteria harus lebih dari 0% sebelum ranking dapat dihitung.</div>}
    {!data.ranking.length ? (
      <Card><Empty icon="♛">Belum ada vendor dengan penilaian lengkap pada periode {formatPeriod(data.periode)}.</Empty></Card>
    ) : (
      <>
        {rankingOnly && (
          <SawPodium
            ranking={rankingWithOfficial}
            period={data.periode}
            onOpenDetail={handleOpenDetail}
          />
        )}
        <Card title={`Hasil Perankingan Lengkap · Periode ${formatPeriod(data.periode)} (${data.ranking.length} Vendor)`}>
          <div className="ranking-controls">
            <div className="ranking-sort-chips">
              <span className="sort-label">Urutan Tampilan:</span>
              <button
                type="button"
                className={`sort-chip ${sortKey === 'official' ? 'active' : ''}`}
                onClick={() => setSortKey('official')}
                title="Urutan peringkat resmi SAW berdasarkan nilai Vi tertinggi"
              >
                🏆 Peringkat SAW (Vi ↓)
              </button>
              <button
                type="button"
                className={`sort-chip ${sortKey === 'name-asc' ? 'active' : ''}`}
                onClick={() => setSortKey('name-asc')}
                title="Urutkan nama vendor A ke Z (nomor peringkat resmi tetap melekat)"
              >
                Nama (A–Z)
              </button>
              <button
                type="button"
                className={`sort-chip ${sortKey === 'name-desc' ? 'active' : ''}`}
                onClick={() => setSortKey('name-desc')}
                title="Urutkan nama vendor Z ke A (nomor peringkat resmi tetap melekat)"
              >
                Nama (Z–A)
              </button>
            </div>
            {sortKey !== 'official' && (
              <button type="button" className="btn-text btn-reset-sort" onClick={() => setSortKey('official')}>
                ↺ Reset ke Peringkat Resmi SAW
              </button>
            )}
          </div>
          <div className="ranking-list">
            {displayRanking.map((row) => {
              let rankClass = 'rank-number';
              let rankBadgeText = `#${row.officialRank}`;
              if (row.officialRank === 1) {
                rankClass = 'rank-number rank-first';
                rankBadgeText = '🥇 #1';
              } else if (row.officialRank === 2) {
                rankClass = 'rank-number rank-silver';
                rankBadgeText = '🥈 #2';
              } else if (row.officialRank === 3) {
                rankClass = 'rank-number rank-bronze';
                rankBadgeText = '🥉 #3';
              }

              const pct = maxVi > 0 ? (Number(row.nilai_akhir) / maxVi) * 100 : 0;

              return (
                <article className={`ranking-card ${row.officialRank === 1 ? 'ranking-winner' : ''}`} key={row.vendor_id}>
                  <div className="ranking-main">
                    <span className={rankClass} title={`Peringkat resmi SAW ke-${row.officialRank}`}>{rankBadgeText}</span>
                    <div>
                      <b style={{ wordBreak: 'break-word' }}>{row.nama_vendor}</b>
                      <small>
                        {row.officialRank === 1
                          ? 'Juara 1 Resmi · Nilai preferensi tertinggi'
                          : `Peringkat #${row.officialRank} Resmi SAW`}
                      </small>
                    </div>
                    <div className="ranking-pct-bar-wrap" title={`Performa relatif: ${pct.toFixed(1)}% terhadap Juara 1`}>
                      <div className="ranking-pct-track">
                        <div
                          className={`ranking-pct-fill ${row.officialRank === 1 ? 'ranking-pct-fill-winner' : ''}`}
                          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                        />
                      </div>
                      <span className="ranking-pct-text">{pct.toFixed(1)}%</span>
                    </div>
                    <strong className="score-value" title={`Nilai Vi: ${Number(row.nilai_akhir).toFixed(4)}`}>
                      {Number(row.nilai_akhir).toFixed(4)}
                    </strong>
                    <Button
                      variant="btn-light btn-small"
                      onClick={(e) => handleOpenDetail(row, e.currentTarget)}
                      aria-label={`Rincian perhitungan SAW ${row.nama_vendor}`}
                    >
                      Rincian nilai
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </Card>
      </>
    )}
    {activeModalVendor && (
      <SawDetailModal
        vendor={activeModalVendor}
        period={data.periode}
        onClose={handleCloseModal}
      />
    )}
    {!rankingOnly && data.ranking.length > 0 && (
      <SawCalculationSteps data={data} />
    )}
    {!rankingOnly && data.criteria.length > 0 && (
      <Card title="Bobot Kriteria yang Digunakan">
        <div className="criteria-bars">
          {data.criteria.map((criterion) => (
            <div className="criteria-bar" key={criterion.id}>
              <span><b>{criterion.kode}</b> {criterion.nama_kriteria}</span>
              <div><span style={{ width: `${Math.max(0, Math.min(100, Number(criterion.bobot)))}%` }} /></div>
              <strong>{Number(criterion.bobot).toFixed(2)}%</strong>
            </div>
          ))}
        </div>
      </Card>
    )}
  </>;
}

function UsersPage({ navigate, notify, currentUser }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => { let alive = true; get('users').then((r) => alive && setData(r)).catch(setError); return () => { alive = false; }; }, []);
  if (error) return <><PageHeading title="Manajemen User" /><ErrorMessage error={error} /></>;
  if (!data) return <Loading />;

  function handleChangeStatus(user) {
    const nextStatus = user.status === 'aktif' ? 'nonaktif' : 'aktif';
    const actionLabel = nextStatus === 'aktif' ? 'Aktifkan' : 'Nonaktifkan';
    setConfirmState({
      title: `${actionLabel} Akun Pengguna`,
      message: `${actionLabel} akun pengguna ${user.nama} (@${user.username})? ${nextStatus === 'nonaktif' ? 'Pengguna tidak akan dapat masuk ke sistem.' : 'Pengguna akan dapat masuk kembali ke sistem.'}`,
      confirmText: actionLabel,
      danger: nextStatus === 'nonaktif',
      onConfirm: async () => {
        try {
          await post('users', 'toggle', { id: user.id, status: nextStatus });
          setData((d) => ({ ...d, users: d.users.map((item) => item.id === user.id ? { ...item, status: nextStatus } : item) }));
          notify(`Status akun ${user.nama} diperbarui.`);
        } catch (e) { setError(e); }
      },
    });
  }

  function handleDisable(user) {
    setConfirmState({
      title: 'Hapus / Nonaktifkan Akun',
      message: `Nonaktifkan akun ${user.nama} (@${user.username})? Tindakan ini akan mencabut akses akun ke sistem.`,
      confirmText: 'Nonaktifkan Akun',
      danger: true,
      onConfirm: async () => {
        try {
          await post('users', 'delete', { id: user.id });
          setData((d) => ({ ...d, users: d.users.map((item) => item.id === user.id ? { ...item, status: 'nonaktif' } : item) }));
          notify('Akun dinonaktifkan.');
        } catch (e) { setError(e); }
      },
    });
  }

  const totalUsers = data.users.length;
  const activeUsers = data.users.filter((u) => u.status === 'aktif').length;
  const inactiveUsers = totalUsers - activeUsers;

  const filteredUsers = data.users.filter((u) => {
    const matchQuery = `${u.nama} ${u.username} ${u.email || ''}`.toLowerCase().includes(query.toLowerCase());
    const matchStatus = statusFilter === 'all' ? true : (statusFilter === 'aktif' ? u.status === 'aktif' : u.status !== 'aktif');
    return matchQuery && matchStatus;
  });

  return <>
    <PageHeading
      title="Manajemen User"
      subtitle="Kelola akun administrator dan status akses sistem SPK Kikost."
      action={<LinkButton to="/users/create.php" variant="btn-primary">＋ Tambah admin</LinkButton>}
    />
    <Card
      title={`${filteredUsers.length} dari ${data.users.length} akun terdaftar`}
      action={
        <div className="table-toolbar-actions">
          <div className="filter-pill-group" role="tablist" aria-label="Filter status user">
            <button type="button" role="tab" aria-selected={statusFilter === 'all'} className={`filter-pill-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>Semua ({totalUsers})</button>
            <button type="button" role="tab" aria-selected={statusFilter === 'aktif'} className={`filter-pill-btn ${statusFilter === 'aktif' ? 'active' : ''}`} onClick={() => setStatusFilter('aktif')}>Aktif ({activeUsers})</button>
            <button type="button" role="tab" aria-selected={statusFilter === 'inactive'} className={`filter-pill-btn ${statusFilter === 'inactive' ? 'active' : ''}`} onClick={() => setStatusFilter('inactive')}>Nonaktif ({inactiveUsers})</button>
          </div>
          <input
            className="search-input"
            placeholder="Cari admin, username, email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cari admin"
          />
        </div>
      }
    >
      <ErrorMessage error={error} />
      <Table
        headers={['Pengguna', 'Peran', 'Status', 'Login Terakhir', 'Aksi']}
        empty={
          query || statusFilter !== 'all' ? (
            <div className="empty-search-state">
              <p>Pengguna tidak ditemukan dengan filter atau kata kunci saat ini.</p>
              <button
                type="button"
                className="btn btn-light btn-small"
                onClick={() => { setQuery(''); setStatusFilter('all'); }}
              >
                Reset Filter & Pencarian
              </button>
            </div>
          ) : (
            'Pengguna tidak ditemukan.'
          )
        }
      >
        {filteredUsers.map((item) => {
          const self = Number(item.id) === Number(currentUser.id);
          const protectedSuper = item.role === 'superadmin';
          return (
            <tr key={item.id}>
              <td>
                <b>{item.nama}</b>
                <small className="table-sub table-email-wrap">@{item.username} · {item.email || 'tanpa email'}</small>
              </td>
              <td><span className="type-chip">{item.role}</span></td>
              <td><span className={`status-pill ${item.status === 'aktif' ? 'pill-success' : 'pill-muted'}`}>{item.status}</span></td>
              <td>{formatDate(item.last_login)}</td>
              <td className="actions actions-users">
                <LinkButton to={`/users/edit.php?id=${item.id}`} variant="btn-icon" aria-label={`Edit ${item.nama}`}>Edit</LinkButton>
                {!self && (
                  <Button variant="btn-icon" onClick={() => handleChangeStatus(item)} aria-label={`${item.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'} ${item.nama}`}>
                    {item.status === 'aktif' ? 'Nonaktif' : 'Aktif'}
                  </Button>
                )}
                {!self && !protectedSuper && (
                  <Button variant="btn-icon btn-danger-soft" onClick={() => handleDisable(item)} aria-label={`Hapus ${item.nama}`}>
                    Hapus
                  </Button>
                )}
                {(self || protectedSuper) && <span className="protected-label">Terlindungi</span>}
              </td>
            </tr>
          );
        })}
      </Table>
    </Card>
    <ConfirmModal
      isOpen={!!confirmState}
      title={confirmState?.title}
      message={confirmState?.message}
      confirmText={confirmState?.confirmText}
      danger={confirmState?.danger}
      onConfirm={() => { const act = confirmState?.onConfirm; setConfirmState(null); act?.(); }}
      onCancel={() => setConfirmState(null)}
    />
  </>;
}

function UserForm({ route, navigate, notify }) {
  const id = Number(route.query.get('id') || 0);
  const editing = route.path.endsWith('/edit.php');
  const [form, setForm] = useState({ username: '', nama: '', email: '', no_hp: '', password: '', password_confirm: '', status: 'aktif' });
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    get('users')
      .then((res) => {
        if (!alive) return;
        const target = res.users?.find((u) => Number(u.id) === id);
        if (!target) {
          setError(new Error('User tidak ditemukan.'));
        } else {
          setUserData(target);
          setForm({
            username: target.username || '',
            nama: target.nama || '',
            email: target.email || '',
            no_hp: target.no_hp || '',
            password: '',
            password_confirm: '',
            status: target.status || 'aktif',
          });
        }
      })
      .catch((err) => {
        if (alive) setError(err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [editing, id]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await post('users', 'update', {
          id,
          nama: form.nama,
          email: form.email,
          no_hp: form.no_hp,
          password: form.password,
          password_confirm: form.password_confirm,
          status: userData?.role === 'superadmin' ? 'aktif' : form.status,
        });
        notify(`Data user ${form.nama || ''} berhasil diperbarui.`);
      } else {
        await post('users', 'create', {
          username: form.username,
          nama: form.nama,
          email: form.email,
          no_hp: form.no_hp,
          password: form.password,
          password_confirm: form.password_confirm,
          status: form.status,
        });
        notify(`Admin "${form.nama || ''}" berhasil ditambahkan.`);
      }
      navigate('/users/index.php');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading label="Memuat data pengguna…" />;

  const fe = fieldErrors(error);
  const isSuperadmin = editing && userData?.role === 'superadmin';

  return (
    <>
      <PageHeading
        title={editing ? 'Edit User' : 'Tambah Admin'}
        subtitle={
          editing
            ? (userData ? `Perbarui data user: @${userData.username}` : 'Perbarui data user.')
            : 'Buat akun admin baru untuk mengakses sistem SPK Kikost.'
        }
        action={<LinkButton to="/users/index.php">← Kembali</LinkButton>}
      />
      <Card
        title={
          editing
            ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                ✏️ Edit: @{userData?.username || form.username}
                {isSuperadmin ? (
                  <span className="type-chip" style={{ background: 'var(--kikost-purple-light)', color: 'var(--kikost-purple-primary)' }}>👑 Superadmin</span>
                ) : (
                  <span className="type-chip">👤 Admin</span>
                )}
              </span>
            )
            : '👤 Form Admin Baru'
        }
        className="form-card"
      >
        <ErrorMessage error={error} />
        <form onSubmit={submit} className="form-stack">
          {editing ? (
            <label className="field">
              <span>Username</span>
              <input type="text" value={form.username} disabled />
              <small className="field-hint">Username tidak dapat diubah.</small>
            </label>
          ) : (
            <div>
              <TextField
                label="Username *"
                value={form.username}
                onChange={(v) => setForm({ ...form, username: v })}
                placeholder="username_admin"
                autoComplete="off"
                error={fe.username}
                required
              />
              <small className="field-hint">Hanya huruf, angka, dan underscore (3–50 karakter).</small>
            </div>
          )}

          <TextField
            label="Nama lengkap *"
            value={form.nama}
            onChange={(v) => setForm({ ...form, nama: v })}
            placeholder="Nama lengkap"
            error={fe.nama}
            required
          />

          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            placeholder="contoh@email.com"
            error={fe.email}
          />

          <TextField
            label="Nomor telepon"
            value={form.no_hp}
            onChange={(v) => setForm({ ...form, no_hp: v })}
            placeholder="08123456789"
            error={fe.no_hp}
          />

          {editing && <div className="password-divider">Ganti password (opsional)</div>}

          <TextField
            label={editing ? 'Password baru' : 'Password *'}
            type="password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            placeholder={editing ? 'Kosongkan jika tidak ingin mengubah' : 'Min. 6 karakter'}
            autoComplete="new-password"
            error={fe.password}
            required={!editing}
          />

          <TextField
            label={editing ? 'Konfirmasi password baru' : 'Konfirmasi password *'}
            type="password"
            value={form.password_confirm}
            onChange={(v) => setForm({ ...form, password_confirm: v })}
            placeholder={editing ? 'Ulangi password baru' : 'Ulangi password'}
            autoComplete="new-password"
            error={fe.password_confirm}
            required={!editing || !!form.password}
          />

          <div>
            <SelectField
              label="Status"
              value={isSuperadmin ? 'aktif' : form.status}
              onChange={(v) => setForm({ ...form, status: v })}
              error={fe.status}
              disabled={isSuperadmin}
            >
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </SelectField>
            {isSuperadmin && (
              <small className="field-hint">Akun superadmin selalu aktif dan tidak dapat dinonaktifkan.</small>
            )}
          </div>

          <div className="form-actions">
            <Button variant="btn-primary" disabled={busy}>
              {busy ? 'Menyimpan…' : (editing ? '💾 Simpan perubahan' : '💾 Simpan admin')}
            </Button>
            <LinkButton to="/users/index.php">Batal</LinkButton>
          </div>
        </form>
      </Card>
    </>
  );
}

function ProfilePage({ route, navigate, notify, onProfileChanged }) {
  const editing = route.query.get('mode') === 'edit';
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    let alive = true;
    get('profile').then((p) => {
      if (!alive) return;
      setProfile(p);
      setForm({ nama: p.nama || '', email: p.email || '', no_hp: p.no_hp || '', old_password: '', new_password: '', password_confirm: '' });
    }).catch(setError);
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  if (error && !profile) return <><PageHeading title="Profil Saya" /><ErrorMessage error={error} /></>;
  if (!profile) return <Loading />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      fd.append('nama', form.nama);
      fd.append('email', form.email);
      fd.append('no_hp', form.no_hp);
      fd.append('old_password', form.old_password);
      fd.append('new_password', form.new_password);
      fd.append('password_confirm', form.password_confirm);
      const result = await postForm('profile', 'update', fd);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setProfile(result.profile);
      onProfileChanged(result.profile);
      notify('Profil berhasil diperbarui.');
      navigate('/users/profile.php');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  function handleDeletePhoto() {
    setConfirmState({
      title: 'Hapus Foto Profil',
      message: 'Hapus foto profil saat ini? Akun akan kembali menggunakan avatar inisial nama.',
      confirmText: 'Hapus Foto',
      danger: true,
      onConfirm: async () => {
        try {
          const updated = await post('profile', 'delete_photo', {});
          const next = { ...profile, foto: updated.foto };
          setProfile(next);
          onProfileChanged(next);
          notify('Foto profil dihapus.');
        } catch (e) {
          setError(e);
        }
      },
    });
  }

  return (
    <>
      <PageHeading
        title="Profil Saya"
        subtitle="Kelola informasi dan keamanan akun pribadi."
        action={
          <LinkButton to={editing ? '/users/profile.php' : '/users/profile.php?mode=edit'}>
            {editing ? '← Kembali' : 'Edit profil'}
          </LinkButton>
        }
      />
      <div className="profile-layout">
        <Card title="Akun">
          <div className="profile-person">
            <span className="profile-avatar">
              {profile.foto ? (
                <img src={`${BASE}/assets/uploads/profiles/${encodeURIComponent(profile.foto)}`} alt="Foto profil" />
              ) : (
                profile.nama.slice(0, 1).toUpperCase()
              )}
            </span>
            <div>
              <h2>{profile.nama}</h2>
              <p>@{profile.username}</p>
              <span className="type-chip">{profile.role}</span>
            </div>
          </div>
          <div className="profile-details">
            <div><small>Email</small><b>{profile.email || 'Belum ditambahkan'}</b></div>
            <div><small>Nomor telepon</small><b>{profile.no_hp || 'Belum ditambahkan'}</b></div>
            <div><small>Login terakhir</small><b>{formatDate(profile.last_login)}</b></div>
            <div><small>Status akun</small><b>{profile.status}</b></div>
          </div>
        </Card>
        {editing && (
          <Card title="Perbarui profil" className="form-card">
            <ErrorMessage error={error} />
            <form onSubmit={submit} className="form-stack">
              <TextField label="Nama lengkap *" value={form.nama} onChange={(v) => setForm({ ...form, nama: v })} error={fieldErrors(error).nama} required />
              <TextField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} error={fieldErrors(error).email} />
              <TextField label="Nomor telepon" value={form.no_hp} onChange={(v) => setForm({ ...form, no_hp: v })} />
              
              <div className="avatar-upload-field">
                <span className="avatar-field-label">Foto profil · JPG, PNG, WEBP · Maks. 2 MB</span>
                <div className="avatar-preview-row">
                  <div className="avatar-preview-circle">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview Foto Baru" />
                    ) : profile.foto ? (
                      <img src={`${BASE}/assets/uploads/profiles/${encodeURIComponent(profile.foto)}`} alt="Foto Saat Ini" />
                    ) : (
                      <span>{profile.nama.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="avatar-input-wrapper">
                    <input type="file" name="foto" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
                    {previewUrl && (
                      <span className="preview-active-tag">✓ Foto baru dipilih (preview lokal). Klik simpan untuk menerapkan.</span>
                    )}
                  </div>
                </div>
                {fieldErrors(error).foto && <small className="field-error">{fieldErrors(error).foto}</small>}
              </div>

              <div className="password-divider">Ganti password (opsional)</div>
              <TextField label="Password lama" type="password" value={form.old_password} onChange={(v) => setForm({ ...form, old_password: v })} error={fieldErrors(error).old_password} />
              <TextField label="Password baru" type="password" value={form.new_password} onChange={(v) => setForm({ ...form, new_password: v })} error={fieldErrors(error).new_password} />
              <TextField label="Konfirmasi password baru" type="password" value={form.password_confirm} onChange={(v) => setForm({ ...form, password_confirm: v })} error={fieldErrors(error).password_confirm} />
              <div className="form-actions">
                <Button variant="btn-primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan perubahan'}</Button>
                {profile.foto && <Button type="button" variant="btn-danger-soft" onClick={handleDeletePhoto}>Hapus foto</Button>}
              </div>
            </form>
          </Card>
        )}
      </div>
      <ConfirmModal
        isOpen={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmText={confirmState?.confirmText}
        danger={confirmState?.danger}
        onConfirm={() => { const act = confirmState?.onConfirm; setConfirmState(null); act?.(); }}
        onCancel={() => setConfirmState(null)}
      />
    </>
  );
}

function NoAccess({ title = 'Akses dibatasi' }) {
  return <><PageHeading title={title} /><div className="notice notice-warn">Akun Anda tidak memiliki izin untuk membuka halaman ini.</div></>;
}

export default function App() {
  const [route, setRoute] = useState(parseRoute());
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);
  const [toast, setToast] = useState('');
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  useEffect(() => { const handler = () => setRoute(parseRoute()); window.addEventListener('popstate', handler); return () => window.removeEventListener('popstate', handler); }, []);
  useEffect(() => { let alive = true; get('auth', {}, 'status').then((data) => { setCsrfToken(data.csrf); if (alive) setSession(data.authenticated ? data.user : null); }).catch(() => { if (alive) setSession(null); }).finally(() => alive && setBooting(false)); return () => { alive = false; }; }, []);
  function notify(message) { setToast(message); window.setTimeout(() => setToast(''), 3200); }
  useEffect(() => {
    if (booting) return;
    if (!session && route.path !== '/auth/login.php') moveTo('/auth/login.php', true);
    else if (session && route.path === '/auth/login.php') moveTo('/dashboard.php', true);
    else if (session && (route.path === '/' || route.path === '/index.php')) moveTo('/dashboard.php', true);
  }, [booting, session, route.path]);

  function requestLogout() {
    setLogoutModalOpen(true);
  }

  async function doLogout() {
    setLogoutModalOpen(false);
    try {
      await post('auth', 'logout', {});
      setSession(null);
      moveTo('/auth/login.php', true);
    } catch (e) {
      notify(e.message);
    }
  }

  if (booting || (session === null && route.path !== '/auth/login.php')) return <Loading label="Memeriksa sesi…" />;
  if (!session) return <LoginPage onAuthenticated={(user) => { setSession(user); moveTo('/dashboard.php', true); }} />;
  let content;
  if (route.path.startsWith('/vendors/create.php') || route.path.startsWith('/vendors/edit.php')) content = <VendorForm route={route} navigate={moveTo} notify={notify} />;
  else if (route.path.startsWith('/vendors/')) content = <VendorsPage route={route} navigate={moveTo} notify={notify} />;
  else if (route.path.startsWith('/kriterias/create.php') || route.path.startsWith('/kriterias/edit.php')) content = session.role === 'superadmin' ? <CriterionForm route={route} navigate={moveTo} notify={notify} /> : <NoAccess title="Manajemen Kriteria" />;
  else if (route.path.startsWith('/kriterias/bobot.php')) content = session.role === 'superadmin' ? <WeightPage navigate={moveTo} notify={notify} /> : <CriteriaPage user={session} route={route} navigate={moveTo} notify={notify} />;
  else if (route.path.startsWith('/kriterias/')) content = <CriteriaPage user={session} route={route} navigate={moveTo} notify={notify} />;
  else if (route.path.startsWith('/penilaian/input.php') || route.path.startsWith('/penilaian/edit.php')) content = <AssessmentForm route={route} navigate={moveTo} notify={notify} />;
  else if (route.path.startsWith('/penilaian/')) content = <AssessmentsPage route={route} navigate={moveTo} notify={notify} />;
  else if (route.path.startsWith('/saw/')) content = <SawPage route={route} navigate={moveTo} />;
  else if (route.path.startsWith('/users/create.php') || route.path.startsWith('/users/edit.php')) content = session.role === 'superadmin' ? <UserForm route={route} navigate={moveTo} notify={notify} /> : <NoAccess title="Manajemen User" />;
  else if (route.path === '/users/profile.php') content = <ProfilePage route={route} navigate={moveTo} notify={notify} onProfileChanged={(profile) => setSession((u) => ({ ...u, ...profile }))} />;
  else if (route.path.startsWith('/users/')) content = session.role === 'superadmin' ? <UsersPage navigate={moveTo} notify={notify} currentUser={session} /> : <DashboardPage user={session} route={route} navigate={moveTo} />;
  else content = <DashboardPage user={session} route={route} navigate={moveTo} />;

  return (
    <AppShell user={session} route={route} navigate={moveTo} onLogout={requestLogout}>
      <div key={`${route.path}-${route.query.get('periode') || ''}`} className="page-transition">
        {content}
      </div>
      {toast && <div className="toast-message" role="status">✓ {toast}</div>}
      <ConfirmModal
        isOpen={logoutModalOpen}
        title="Keluar dari Akun"
        message="Yakin ingin keluar dari akun sistem SPK Kikost? Sesi login Anda akan diakhiri."
        confirmText="Keluar"
        cancelText="Batal"
        danger={false}
        onConfirm={doLogout}
        onCancel={() => setLogoutModalOpen(false)}
      />
    </AppShell>
  );
}
