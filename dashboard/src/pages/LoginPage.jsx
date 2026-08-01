import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setSession } from '../api.js';

// Pegada vetorial da marca (mesmo desenho do logo, em miniatura).
function Footprint(props) {
  return (
    <svg viewBox="0 0 40 56" aria-hidden="true" {...props}>
      <g fill="currentColor">
        <ellipse cx="19" cy="26" rx="12.5" ry="10" transform="rotate(-10 19 26)" />
        <ellipse cx="21" cy="43.5" rx="7.5" ry="7" />
        <circle cx="8" cy="14" r="4.4" />
        <circle cx="15.8" cy="9.5" r="3.7" />
        <circle cx="22.6" cy="8.8" r="3.4" />
        <circle cx="28.6" cy="10.6" r="3.1" />
        <circle cx="33.8" cy="14.4" r="2.8" />
      </g>
    </svg>
  );
}

// Trilha que sobe da base à direita do painel de marca: pé esquerdo/direito alternados.
const TRAIL = [
  { left: '5%', bottom: '11%', rot: 22, flip: false, w: 42, delay: 0 },
  { left: '17%', bottom: '19%', rot: 18, flip: true, w: 40, delay: 0.18 },
  { left: '30%', bottom: '28%', rot: 14, flip: false, w: 38, delay: 0.36 },
  { left: '43%', bottom: '38%', rot: 10, flip: true, w: 36, delay: 0.54 },
  { left: '57%', bottom: '49%', rot: 6, flip: false, w: 34, delay: 0.72 },
  { left: '70%', bottom: '61%', rot: 2, flip: true, w: 32, delay: 0.9 },
  { left: '82%', bottom: '74%', rot: -2, flip: false, w: 30, delay: 1.08 },
];

function FootprintTrail({ steps, opacity, className = '' }) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`} aria-hidden="true">
      {steps.map((s, i) => (
        <span
          key={i}
          className="pn-step"
          style={{
            left: s.left,
            bottom: s.bottom,
            width: s.w,
            animationDelay: `${s.delay}s`,
            '--pn-opacity': opacity,
          }}>
          <Footprint style={{ transform: `rotate(${s.rot}deg)${s.flip ? ' scaleX(-1)' : ''}` }} />
        </span>
      ))}
    </div>
  );
}

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
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(155,231,196,.25), transparent 70%)' }} />
        <FootprintTrail steps={TRAIL} opacity={0.17} className="text-[#c8f79a]" />

        <img src="/logo-light.svg" alt="PegadaNeutra" className="relative z-10 h-14 self-start" />
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            Meça a pegada de carbono<br />dos seus eventos.
          </h1>
          <p className="mt-4 text-emerald-100/90 max-w-md text-lg">
            Cada participante informa como chegou; o PegadaNeutra calcula a emissão de CO₂e
            do transporte e consolida tudo em relatórios.
          </p>
        </div>
        <p className="relative z-10 text-emerald-200/70 text-sm">🌿 Cada passo conta — o seu também</p>
      </div>

      {/* formulário */}
      <div className="relative flex items-center justify-center p-6 bg-(--surface) overflow-hidden">
        <FootprintTrail
          steps={TRAIL.slice(0, 4).map((s) => ({ ...s, w: s.w * 0.8 }))}
          opacity={0.07}
          className="text-(--brand-700)"
        />
        <form onSubmit={submit} className="relative z-10 w-full max-w-sm space-y-5">
          <div className="lg:hidden flex justify-center mb-2">
            <img src="/logo.svg" alt="PegadaNeutra" className="h-12" />
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
