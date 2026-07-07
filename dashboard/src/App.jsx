import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { getToken, getAdmin, clearSession } from './api.js';
import LoginPage from './pages/LoginPage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LeadsPage from './pages/LeadsPage.jsx';
import AnswersPage from './pages/AnswersPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import SyncLogsPage from './pages/SyncLogsPage.jsx';

function RequireAuth({ children }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

function Shell({ children }) {
  const navigate = useNavigate();
  const admin = getAdmin();
  const link = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-emerald-800 text-white' : 'text-emerald-100 hover:bg-emerald-800/60'}`;

  return (
    <div className="min-h-screen">
      <header className="no-print bg-emerald-900 text-white">
        <div className="mx-auto max-w-7xl flex items-center gap-6 px-4 py-3">
          <span className="font-bold text-lg">🌱 Carbono Zero</span>
          <nav className="flex gap-1 flex-1">
            <NavLink to="/" end className={link}>Dashboard</NavLink>
            <NavLink to="/eventos" className={link}>Eventos</NavLink>
            <NavLink to="/leads" className={link}>Leads</NavLink>
            <NavLink to="/respostas" className={link}>Respostas</NavLink>
            <NavLink to="/relatorio" className={link}>Relatório</NavLink>
            <NavLink to="/sincronizacao" className={link}>Sincronização</NavLink>
          </nav>
          <span className="text-sm text-emerald-200">{admin?.name}</span>
          <button
            className="text-sm text-emerald-200 hover:text-white"
            onClick={() => { clearSession(); navigate('/login'); }}
          >
            Sair
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
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
        <Route path="/sincronizacao" element={<RequireAuth><Shell><SyncLogsPage /></Shell></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
