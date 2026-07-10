import { useEffect, useState } from 'react';
import { api, getAdmin } from '../api.js';
import { Card } from '../components/ui.jsx';

const EMPTY = { name: '', email: '', password: '', role: 'viewer' };
const ROLE_LABEL = { admin: 'Administrador', viewer: 'Visualizador' };

export default function UsersPage() {
  const me = getAdmin();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => api('/api/admin/users').then(setUsers).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function createUser(e) {
    e.preventDefault();
    setError(''); setNotice('');
    try {
      await api('/api/admin/users', { method: 'POST', body: JSON.stringify(form) });
      setForm(EMPTY);
      setNotice(`Usuário ${form.email} criado.`);
      load();
    } catch (err) { setError(err.message); }
  }

  async function changeRole(u, role) {
    setError(''); setNotice('');
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'PUT', body: JSON.stringify({ role }) });
      load();
    } catch (err) { setError(err.message); }
  }

  async function removeUser(u) {
    if (!window.confirm(`Remover o usuário ${u.name} (${u.email})?`)) return;
    setError(''); setNotice('');
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      load();
    } catch (err) { setError(err.message); }
  }

  const input = 'rounded-lg border border-black/15 bg-white px-3 py-2 text-sm w-full';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Usuários</h1>

      <Card>
        <h2 className="font-semibold mb-3">Novo usuário</h2>
        <form onSubmit={createUser} className="grid gap-3 md:grid-cols-5">
          <input className={input} placeholder="Nome*" required
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={input} type="email" placeholder="E-mail*" required
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={input} type="password" placeholder="Senha* (mín. 8)" required minLength={8}
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="viewer">Visualizador (só consulta)</option>
            <option value="admin">Administrador (acesso total)</option>
          </select>
          <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            Criar usuário
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {notice && <p className="mt-2 text-sm text-emerald-700">{notice}</p>}
        <p className="mt-3 text-xs text-(--muted)">
          <strong>Administrador</strong> cria eventos, usuários e exporta dados.
          <strong> Visualizador</strong> apenas consulta dashboard, leads e respostas.
        </p>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-(--ink-2) border-b border-(--grid)">
              <th className="py-2">Nome</th><th>E-mail</th><th>Papel</th><th>Criado em</th><th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-(--grid) last:border-0">
                <td className="py-2 font-medium">
                  {u.name}{u.id === me?.id && <span className="ml-1 text-xs text-(--muted)">(você)</span>}
                </td>
                <td>{u.email}</td>
                <td>
                  <select
                    className="rounded-lg border border-black/15 bg-white px-2 py-1 text-sm disabled:opacity-60"
                    value={u.role}
                    disabled={u.id === me?.id}
                    onChange={(e) => changeRole(u, e.target.value)}
                  >
                    <option value="viewer">{ROLE_LABEL.viewer}</option>
                    <option value="admin">{ROLE_LABEL.admin}</option>
                  </select>
                </td>
                <td className="whitespace-nowrap">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="text-right">
                  {u.id !== me?.id && (
                    <button className="text-red-600 hover:underline" onClick={() => removeUser(u)}>Remover</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
