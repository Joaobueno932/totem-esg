import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setSession } from '../api.js';

// Pegada de capivara: coxim central com os dedos abrindo em leque.
// A pata dianteira tem 4 dedos e a traseira 3 — a trilha alterna as duas.
const TOES = {
  front: [{ a: -66, s: 0.9 }, { a: -30, s: 1.05 }, { a: 6, s: 1.06 }, { a: 42, s: 0.92 }],
  hind: [{ a: -48, s: 0.96 }, { a: -4, s: 1.08 }, { a: 40, s: 0.98 }],
};
const PAD = 'M14 26.6c1.6-4.8 5.8-7.8 10.8-7.6 5 .2 9 3 9.6 7.4.6 5-2.2 9.8-7.2 11.8-4.6 1.8-10.2.2-12.2-4-1.6-3-2-5.2-1-7.6z';
const TOE = 'M0 0C-1.9-2.8-3.4-6-3.3-8.8-3.1-11.8-1.4-13.5 .3-13.5 2.2-13.5 3.6-11.8 3.6-8.7 3.6-5.8 1.8-2.8 0 0Z';

function CapybaraTrack({ paw = 'front', ...props }) {
  const cx = 24;
  const cy = 30;
  const base = 11.5; // distância do centro do coxim até a raiz do dedo
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <g fill="currentColor">
        <path d={PAD} />
        {TOES[paw].map((t) => {
          const rad = (t.a * Math.PI) / 180;
          const x = (cx + base * Math.sin(rad)).toFixed(2);
          const y = (cy - base * Math.cos(rad)).toFixed(2);
          return <path key={t.a} d={TOE} transform={`translate(${x} ${y}) rotate(${t.a}) scale(${t.s})`} />;
        })}
      </g>
    </svg>
  );
}

// Trilha que sobe da base à direita do painel de marca: patas esquerda/direita alternadas.
const TRAIL = [
  { left: '5%', bottom: '11%', rot: 24, flip: false, paw: 'front', w: 44, delay: 0 },
  { left: '17%', bottom: '19%', rot: 16, flip: true, paw: 'hind', w: 41, delay: 0.18 },
  { left: '30%', bottom: '28%', rot: 20, flip: false, paw: 'front', w: 39, delay: 0.36 },
  { left: '43%', bottom: '38%', rot: 12, flip: true, paw: 'hind', w: 37, delay: 0.54 },
  { left: '57%', bottom: '49%', rot: 14, flip: false, paw: 'front', w: 35, delay: 0.72 },
  { left: '70%', bottom: '61%', rot: 6, flip: true, paw: 'hind', w: 33, delay: 0.9 },
  { left: '82%', bottom: '74%', rot: 8, flip: false, paw: 'front', w: 31, delay: 1.08 },
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
          <CapybaraTrack paw={s.paw} style={{ transform: `rotate(${s.rot}deg)${s.flip ? ' scaleX(-1)' : ''}` }} />
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

        <img src="/logo-light.webp" alt="PegadaNeutra" className="relative z-10 h-16 self-start" />
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
            <img src="/logo.webp" alt="PegadaNeutra" className="h-14" />
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
