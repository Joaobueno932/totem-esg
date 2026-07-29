import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setSession } from '../api.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, admin } = await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(token, admin);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* painel de marca */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #159169, #0b4d34 65%, #072e20)' }}>
        <img src="/logo.png" alt="EcoTrajeto" className="h-16 self-start drop-shadow-lg" />
        <div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            Meça a pegada de carbono<br />dos seus eventos.
          </h1>
          <p className="mt-4 text-emerald-100/90 max-w-md text-lg">
            Cada participante informa como chegou; o EcoTrajeto calcula a emissão de CO₂e
            do transporte e consolida tudo em relatórios.
          </p>
        </div>
        <p className="text-emerald-200/70 text-sm">🌿 Eventos mais conscientes</p>
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(155,231,196,.25), transparent 70%)' }} />
      </div>

      {/* formulário */}
      <div className="flex items-center justify-center p-6 bg-(--surface)">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden flex justify-center mb-2">
            <span className="inline-flex rounded-2xl px-5 py-3" style={{ background: 'linear-gradient(135deg, #0a3325, #08243a)' }}>
              <img src="/logo.png" alt="EcoTrajeto" className="h-9" />
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-(--ink)">Entrar no painel</h2>
            <p className="text-sm text-(--ink-2) mt-1">Acesso da equipe organizadora.</p>
          </div>
          <label className="block text-sm font-medium text-(--ink-2)">
            E-mail
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="cz-input mt-1.5" placeholder="voce@empresa.com" />
          </label>
          <label className="block text-sm font-medium text-(--ink-2)">
            Senha
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="cz-input mt-1.5" placeholder="••••••••" />
          </label>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button disabled={loading} className="cz-btn cz-btn-primary w-full justify-center py-3 text-base disabled:opacity-50">
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
