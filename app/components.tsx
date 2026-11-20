'use client';

import { useAccount } from './account-context';
// Import Next.js Link for navigation between app pages.
import Link from 'next/link';

// Describe the links rendered by the sidebar.
const navItems = [
  // Point the dashboard link to the home route and use a grid icon.
  { key: 'dashboard', href: '/', label: 'Dashboard', icon: 'grid' },
  // Point the inventory link to its batch management page and use a box icon.
  { key: 'inventory', href: '/inventory', label: 'Inventory', icon: 'box' },
  // Point the waste link to its history page and use a cycle icon.
  { key: 'waste', href: '/waste', label: 'Waste records', icon: 'cycle' }
// End the sidebar link list.
];

// Choose a decorative SVG based on a navigation item's icon name.
function NavIcon({ name }: { name: string }) {
  // Draw the box icon for inventory.
  if (name === 'staff') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>;
  if (name === 'box') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7M12 11v10" /></svg>;
  // Draw two cycling arrows for waste records.
  if (name === 'cycle') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 8.1A7 7 0 0 1 18.5 7L20 12M18 15.9A7 7 0 0 1 5.5 17L4 12" /></svg>;
  // Use a four-square grid for the dashboard or any other name.
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>;
// End the icon component.
}

// Wrap internal pages in a shared sidebar and content area; active identifies the current page.
export function Layout({ children, active }: { children: React.ReactNode; active?: string }) {
  const account = useAccount();
  const links = account?.role === 'admin' ? [...navItems, { key: 'staff', href: '/staff', label: 'Staff accounts', icon: 'staff' }] : navItems;
  // Return the app shell markup.
  return (
    // Line 59 — Open the outer wrapper that positions the sidebar and page content.
    // Line 60 — Start the sidebar.
    // Line 61 — Link the FreshTrack brand back to the dashboard and give it an accessible name.
    // Line 62 — Show the logo through CSS and hide the decorative mark from assistive technology.
    // Line 63 — Display the product name and sidebar tagline.
    // Line 64 — End the link back to the dashboard.
    // Line 65 — Start the labeled primary navigation area.
    // Line 66 — Label the navigation section Workspace.
    // Render one navigation link per configured item.
    // Use the item's stable key and highlight the link when active matches its key.
    // Line 69 — Render the SVG icon chosen by the item's configuration.
    // Line 70 — Show the item's readable label.
    // Line 71 — Add a visual dot to the active item only.
    // Line 72 — End the individual navigation link.
    // Line 73 — Finish mapping the navigation configuration.
    // Line 74 — End the navigation area.
    // Line 75 — Start the sidebar's decorative status card.
    // Line 76 — Render the dot and orbit graphic.
    // Line 77 — Display the fixed status text; this card does not run a database health check.
    // Line 78 — End the status card.
    // Line 79 — End the sidebar.
    // Line 80 — Render ambient decoration and the page content supplied by the caller.
    // Line 81 — End the app shell.
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="FreshTrack home">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-copy">FreshTrack<small>SMART INVENTORY</small></span>
        </Link>
        <nav className="nav" aria-label="Primary navigation">
          <div className="nav-label">Workspace</div>
          {links.map(item => (
            <Link className={active === item.key ? 'active' : ''} aria-label={item.label} href={item.href} key={item.key}>
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
  // Finish returning the layout markup.
  );
// End the Layout component.
}

// Render the reusable page header from text props and an optional action.
export function Header({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  const account = useAccount();
  // Return the page header markup.
  return (
    // Line 100 — Open the header wrapper styled by the top class.
    // Line 101 — Group the header's text together.
    // Line 102 — Display the short section label with its decorative line.
    // Line 103 — Display the main page title.
    // Line 104 — Display the supporting description.
    // Line 105 — End the text group.
    // Show the page action, signed-in identity and logout control.
    // Line 110 — End the header element.
    <header className="top">
      <div>
        <div className="eyebrow"><span />{eyebrow}</div>
        <h1 className="title">{title}</h1>
        <div className="subtitle">{subtitle}</div>
      </div>
      <div className="top-actions">{action}
        <span className="account-label">{account?.name}<small>{account?.role}</small></span>
        <form action="/api/auth/logout" method="post"><button className="sign-out" type="submit">Log out</button></form>
      </div>
    </header>
  // Finish returning the header markup.
  );
// End the Header component.
}
