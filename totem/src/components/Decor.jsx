// Elementos decorativos do fundo (folhas e pegadas). Puramente visuais: ficam fora
// da árvore de acessibilidade e não recebem toque.

// Pegada de capivara — mesmo desenho da tela de login do dashboard: coxim central
// com os dedos em leque (pata dianteira com 4 dedos, traseira com 3).
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
    <svg viewBox="0 0 48 48" {...props}>
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

// Folha estilizada com nervura central (viewBox 0 0 60 100).
function Leaf({ className, style }) {
  return (
    <svg className={`leaf ${className}`} style={style} viewBox="0 0 60 100">
      <path d="M30 2C52 22 60 58 30 98 0 58 8 22 30 2z" fill="currentColor" />
      <path d="M30 14v78M30 40l12-10M30 56l13-11M30 72l11-9M30 40L18 30M30 56L17 45M30 72L19 63"
        fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// trilha no canto superior direito, à direita da marca e acima do progresso
const TRAIL = [
  { right: '13%', top: 'calc(var(--safe-top) + 20px)', rot: 58, paw: 'front', w: 13 },
  { right: '8%', top: 'calc(var(--safe-top) + 8px)', rot: 50, paw: 'hind', w: 12, flip: true },
  { right: '3%', top: 'calc(var(--safe-top) + 18px)', rot: 62, paw: 'front', w: 11 },
];

export default function HeroDecor({ trail = true }) {
  return (
    <div className="hero-decor" aria-hidden="true">
      <span className="glow" />
      <Leaf className="leaf-a" />
      <Leaf className="leaf-b" />
      <Leaf className="leaf-c" />
      <Leaf className="leaf-d" />
      {trail && TRAIL.map((s, i) => (
        <CapybaraTrack
          key={i} paw={s.paw} className="paw"
          style={{ right: s.right, top: s.top, width: s.w, transform: `rotate(${s.rot}deg)${s.flip ? ' scaleX(-1)' : ''}` }}
        />
      ))}
    </div>
  );
}
