import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

const PAGES = [
  {
    id: 'overview', label: 'Overview', short: 'Home',
    icon: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  },
  {
    id: 'merchants', label: 'Acquisitions', short: 'Acquire',
    icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  },
  {
    id: 'storecapture', label: 'Store Capture', short: 'Capture',
    icon: 'M19 13H5v-2h14v2zm0 6H5v-2h14v2zm0-12H5V5h14v2z',
  },
  {
    id: 'fieldops', label: 'Daily Reports', short: 'Daily',
    icon: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z',
  },
  {
    id: 'agents', label: 'Agents', short: 'Agents',
    icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  },
  {
    id: 'insights', label: 'Insights', short: 'Insights',
    icon: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
  },
];

export default function Nav({ activePage, onPageChange, badges = {} }) {
  const { signOut, user } = useAuth();
  const { refresh, isRefreshing } = useData();

  return (
    <>
      {/* ── Desktop / Tablet nav ── */}
      <nav className="nav">
        <img src="/logo.svg" alt="STEP Network" className="nav-logo" />
        <div className="nav-brand">
          <span className="nav-brand-title">STEP Merchant Acquisition</span>
          <span className="nav-brand-sub">Live Dashboard</span>
        </div>
        <div className="nav-sep" />
        <div className="tabs">
          {PAGES.map((p) => {
            const badge = badges[p.id] || 0;
            return (
              <button
                key={p.id}
                className={`tab${activePage === p.id ? ' active' : ''}`}
                onClick={() => onPageChange(p.id)}
              >
                {p.label}
                {badge > 0 && (
                  <span className="tab-badge">{badge > 99 ? '99+' : badge}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="nav-r">
          <div className="live-pill">
            <div className="dot" />
            <span className="live-pill-text">2 Live Sheets</span>
          </div>
          {user && (
            <span className="nav-user" title={user.email}>
              {user.email}
            </span>
          )}
          <button
            className={`ref-btn${isRefreshing ? ' spin' : ''}`}
            onClick={() => refresh()}
            disabled={isRefreshing}
          >
            <svg viewBox="0 0 24 24">
              <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
            <span className="ref-btn-text">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
          <button className="signout-btn" onClick={signOut} title="Sign out">
            <svg viewBox="0 0 24 24">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
          </button>
        </div>
      </nav>

      {/* ── Mobile bottom navigation ── */}
      <div className="mobile-nav">
        {PAGES.map((p) => {
          const badge = badges[p.id] || 0;
          return (
            <button
              key={p.id}
              className={`mobile-tab${activePage === p.id ? ' active' : ''}`}
              onClick={() => onPageChange(p.id)}
            >
              <svg viewBox="0 0 24 24" className="mobile-tab-icon">
                <path d={p.icon} />
              </svg>
              <span className="mobile-tab-label">{p.short}</span>
              {badge > 0 && (
                <span className="tab-badge" style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '8px', minWidth: '14px', height: '14px' }}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
