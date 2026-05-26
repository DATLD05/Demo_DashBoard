import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { Activity, ClipboardList, FileClock, LayoutGrid } from 'lucide-react';
import './styles.css';

const routes = [
  {
    path: '/encounters-non-admissions',
    label: 'Encounters - Non Admissions',
    icon: Activity,
    src: 'https://app.powerbi.com/reportEmbed?reportId=64324848-8134-46f5-a61e-769672ed667c&autoAuth=true&ctid=e7572e92-7aee-4713-a3c4-ba64888ad45f&pageName=2a18da0a1a409952ea0d&navContentPaneEnabled=false&filterPaneEnabled=false&pageView=fitToPage'
  },
  {
    path: '/admissions-readmissions',
    label: 'Admissions and Readmissions',
    icon: FileClock,
    src: 'https://app.powerbi.com/reportEmbed?reportId=64324848-8134-46f5-a61e-769672ed667c&autoAuth=true&ctid=e7572e92-7aee-4713-a3c4-ba64888ad45f&pageName=c229d37e2e50b41bccf9&navContentPaneEnabled=false&filterPaneEnabled=false&pageView=fitToPage'
  },
  {
    path: '/procedures',
    label: 'Procedures',
    icon: ClipboardList,
    src: 'https://app.powerbi.com/reportEmbed?reportId=64324848-8134-46f5-a61e-769672ed667c&autoAuth=true&ctid=e7572e92-7aee-4713-a3c4-ba64888ad45f&pageName=ff2d06abb8a07067eadd&navContentPaneEnabled=false&filterPaneEnabled=false&pageView=fitToPage'
  },
  {
    path: '/router-4',
    label: 'Router 4',
    icon: LayoutGrid
  }
];

function DashboardFrame({ title, src }) {
  return (
    <section className="dashboard-view" aria-label={title}>
      <iframe
        title={title}
        src={src}
        allowFullScreen
        frameBorder="0"
        className="dashboard-frame"
      />
    </section>
  );
}

function EmptyRouter() {
  return (
    <section className="empty-view" aria-label="Router 4">
      <div className="empty-panel">
        <LayoutGrid size={42} strokeWidth={1.6} />
        <h1>Router 4</h1>
        <p>Chua co dashboard duoc gan cho router nay.</p>
      </div>
    </section>
  );
}

function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">H</div>
          <div>
            <p className="brand-kicker">Leadership</p>
            <h1>Hospital Dashboard</h1>
          </div>
        </div>

        <nav className="nav-list" aria-label="Dashboard routers">
          {routes.map(({ path, label, icon: Icon }) => (
            <NavLink key={path} to={path} className="nav-link">
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to={routes[0].path} replace />} />
          {routes.slice(0, 3).map(({ path, label, src }) => (
            <Route
              key={path}
              path={path}
              element={<DashboardFrame title={label} src={src} />}
            />
          ))}
          <Route path="/router-4" element={<EmptyRouter />} />
          <Route path="*" element={<Navigate to={routes[0].path} replace />} />
        </Routes>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  </React.StrictMode>
);
