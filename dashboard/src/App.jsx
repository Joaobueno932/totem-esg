import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { getToken, getAdmin, isAdmin, canManageEvents, ROLE_LABELS, clearSession } from './api.js';
import LoginPage from './pages/LoginPage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LeadsPage from './pages/LeadsPage.jsx';
import AnswersPage from './pages/AnswersPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import SyncLogsPage from './pages/SyncLogsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

function RequireAuth({ children }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

// Rotas restritas a administradores (ex.: gestão de usuários).
function RequireAdmin({ children }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/" replace />;
  return children;
}

// Rotas de gestão (admin ou organizador): ex. Sincronização.
function RequireManage({ children }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  if (!canManageEvents()) return <Navigate to="/" replace />;
  return children;
}

const NAV = [
  { to: '/', end: true, icon: '📊', label: 'Dashboard' },
  { to: '/eventos', icon: '🎫', label: 'Eventos' },
  { to: '/leads', icon: '👥', label: 'Leads' },
  { to: '/respostas', icon: '📝', label: 'Respostas' },
  { to: '/relatorio', icon: '📄', label: 'Relatório' },
  { to: '/sincronizacao', icon: '🔄', label: 'Sincronização', show: 'manage' },
  { to: '/usuarios', icon: '🔑', label: 'Usuários', show: 'admin' },
];

function Shell({ children }) {
  const navigate = useNavigate();
  const admin = getAdmin();
  const items = NAV.filter((n) =>
    n.show === 'admin' ? admin?.role === 'admin'
      : n.show === 'manage' ? canManageEvents()
        : true);

  return (
    <div className="min-h-screen flex">
      <aside className="cz-sidebar no-print sticky top-0 h-screen w-16 md:w-64 flex flex-col shrink-0 text-white">
        <div className="px-3 md:px-5 h-16 flex items-center justify-center md:justify-start border-b border-white/10">
          <img src="/mark.png" alt="EcoTrajeto" className="h-10 md:hidden" />
          <img src="/logo.png" alt="EcoTrajeto" className="hidden md:block h-10" />
        </div>
        <nav className="cz-nav flex-1 p-2 md:p-3 overflow-y-auto">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `cz-nav-item ${isActive ? 'active' : ''} justify-center md:justify-start`}
              title={n.label}>
              <span className="cz-nav-ico">{n.icon}</span>
              <span className="hidden md:inline">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-2 md:p-3 border-t border-white/10">
          <div className="hidden md:block px-2 pb-2">
            <p className="text-sm font-semibold text-white truncate">{admin?.name}</p>
            <span className={`cz-badge cz-badge-${admin?.role || 'viewer'} mt-1`}>
              {ROLE_LABELS[admin?.role] || 'Visualizador'}
            </span>
          </div>
          <button
            className="cz-nav-item w-full justify-center md:justify-start"
            onClick={() => { clearSession(); navigate('/login'); }}
            title="Sair">
            <span className="cz-nav-ico">🚪</span>
            <span className="hidden md:inline">Sair</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 px-4 md:px-8 py-6 md:py-8 max-w-7xl w-full mx-auto">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><Shell><DashboardPage /></Shell></RequireAuth>} />
        <Route path="/eventos" element={<RequireAuth><Shell><EventsPage /></Shell></RequireAuth>} />
        <Route path="/leads" element={<RequireAuth><Shell><LeadsPage /></Shell></RequireAuth>} />
        <Route path="/respostas" element={<RequireAuth><Shell><AnswersPage /></Shell></RequireAuth>} />
        <Route path="/relatorio" element={<RequireAuth><Shell><ReportPage /></Shell></RequireAuth>} />
        <Route path="/sincronizacao" element={<RequireManage><Shell><SyncLogsPage /></Shell></RequireManage>} />
        <Route path="/usuarios" element={<RequireAdmin><Shell><UsersPage /></Shell></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
