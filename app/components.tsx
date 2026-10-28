import Link from 'next/link';

const navItems = [
  { key: 'dashboard', href: '/', label: 'Dashboard', icon: 'grid' },
  { key: 'inventory', href: '/inventory', label: 'Inventory', icon: 'box' },
  { key: 'waste', href: '/waste', label: 'Waste records', icon: 'cycle' }
];

function NavIcon({ name }: { name: string }) {
  if (name === 'box') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7M12 11v10" /></svg>;
  if (name === 'cycle') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 8.1A7 7 0 0 1 18.5 7L20 12M18 15.9A7 7 0 0 1 5.5 17L4 12" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>;
}

export function Layout({ children, active }: { children: React.ReactNode; active?: string }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="FreshTrack home">
          <span className="brand-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c6-3 8-8 8-14-6 0-11 3-13 8-1 3 1 5 5 6Z" /><path d="M7 20c2-5 5-8 10-11" /></svg></span>
          <span className="brand-copy">FreshTrack<small>SMART INVENTORY</small></span>
        </Link>
        <nav className="nav" aria-label="Primary navigation">
          <div className="nav-label">Workspace</div>
          {navItems.map(item => (
            <Link className={active === item.key ? 'active' : ''} href={item.href} key={item.key}>
              <span className="nav-icon"><NavIcon name={item.icon} /></span>
              <span>{item.label}</span>
              {active === item.key && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-status">
          <div className="status-orbit"><span /></div>
          <div><strong>Systems healthy</strong><small>Database connected</small></div>
        </div>
      </aside>
      <main className="main"><div className="ambient ambient-one" /><div className="ambient ambient-two" />{children}</main>
    </div>
  );
}

export function Header({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <header className="top">
      <div>
        <div className="eyebrow"><span />{eyebrow}</div>
        <h1 className="title">{title}</h1>
        <div className="subtitle">{subtitle}</div>
      </div>
      <div className="top-actions">{action}<div className="user-avatar" title="FreshTrack workspace">FT</div></div>
    </header>
  );
}
