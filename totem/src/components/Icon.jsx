// Ícones de traço (grade 24×24) desenhados para o app — sem biblioteca de ícones.
// Os de transporte têm um preenchimento leve (TINT) para ganhar peso nos cartões.
const TINT = { fill: 'currentColor', fillOpacity: 0.16 };

const ICONS = {
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'chevron-left': <path d="M15 5l-7 7 7 7" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  leaf: <><path d="M4.5 19.5C4 11 9.5 4.5 20 4c-.5 10.5-7 16-15.5 15.5z" {...TINT} /><path d="M4.5 19.5L13.5 10.5" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  building: <><path d="M3 20.5h18M4.5 18h15M6 9v9M10 9v9M14 9v9M18 9v9" /><path d="M4 9h16L12 3.5 4 9z" /></>,
  flag: <path d="M5 21V4h11l-2 4 2 4H5" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" /></>,
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M4 7.5l8 6 8-6" /></>,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18" /></>,
  map: <path d="M9 4.5L3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5l-6-2zM9 4.5v13M15 6.5v13" />,
  city: <><path d="M3 20.5h18M5 20.5V8l6-3v15.5M11 10h6.5a1.5 1.5 0 0 1 1.5 1.5v9" /><path d="M8 9.5v.01M8 13v.01M8 16.5v.01M14.5 13.5v.01M14.5 17v.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.01" /></>,
  share: <><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1" /></>,
  route: <><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18H16a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h7.5" /></>,
  fuel: <path d="M4 20.5v-15a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15M3 20.5h12M4 10h10M14 8.5h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3" />,
  road: <path d="M8 3.5L4 20.5M16 3.5l4 17M12 4.5v2.5M12 10.5v3M12 17v3" />,
  repeat: <path d="M4 9h13l-3.5-3.5M20 15H7l3.5 3.5" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M15.5 4.8a3.5 3.5 0 0 1 0 6.4M17.5 14.8c2 .7 3.4 2.4 4 5.2" /></>,
  'cloud-check': <><path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.6 3.8 3.8 0 0 1-.4 7.4H7z" /><path d="M9.5 14l2 2 3.5-3.5" /></>,
  pencil: <><path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5 4 20z" /><path d="M13.5 7l3 3" /></>,
  refresh: <path d="M4.5 12a7.5 7.5 0 0 1 13-5.1L20 9.5M20 4.5v5h-5M19.5 12a7.5 7.5 0 0 1-13 5.1L4 14.5M4 19.5v-5h5" />,

  // ---------- Transportes (ids de MODES em emissions/calc.js) ----------
  carro: <>
    <path d="M5.5 10.5l1.4-4A2 2 0 0 1 8.8 5h6.4a2 2 0 0 1 1.9 1.5l1.4 4" />
    <path d="M3.5 12.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2V17h-17z" {...TINT} />
    <path d="M5.5 17v2.5M18.5 17v2.5M7 13.8h1.5M15.5 13.8H17" />
  </>,
  moto: <>
    <circle cx="5.5" cy="16" r="3.2" /><circle cx="18.5" cy="16" r="3.2" />
    <path d="M18.5 16l-3-7.5h-2.5M5.5 16l3-5h7M6 9.5h4" />
    <path d="M8.5 11l1.5 4.5h3l2.5-4.5z" {...TINT} />
  </>,
  onibus: <>
    <rect x="4.5" y="3" width="15" height="15.5" rx="2.5" {...TINT} />
    <path d="M4.5 11.5h15M9.5 5.5h5M7 18.5V21M17 18.5V21M2.5 7.5v3M21.5 7.5v3M8 15h.01M16 15h.01" />
  </>,
  van: <>
    <path d="M2.5 16.5V7.5A1.5 1.5 0 0 1 4 6h10.8a2 2 0 0 1 1.6.8L20 11.5l.9.4c.4.2.6.6.6 1v2.6a1 1 0 0 1-1 1H19.5M15 16.5H8.5M4.5 16.5h-2" {...TINT} />
    <circle cx="6.5" cy="16.5" r="2" /><circle cx="17" cy="16.5" r="2" />
    <path d="M2.5 11h17.5M14.5 6v5" />
  </>,
  aplicativo_taxi: <>
    <rect x="9.5" y="2" width="5" height="3" rx="1" {...TINT} />
    <path d="M5.5 10.5l1.4-4A2 2 0 0 1 8.8 5h6.4a2 2 0 0 1 1.9 1.5l1.4 4" />
    <path d="M3.5 12.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2V17h-17z" {...TINT} />
    <path d="M5.5 17v2.5M18.5 17v2.5M7 13.8h1.5M15.5 13.8H17" />
  </>,
  aviao: <path d="M12 2.5c1 0 1.6 1 1.6 2.2v4.6l6.9 4.1v2.2l-6.9-2v4.3l2 1.5v1.8L12 20.4l-3.6.8v-1.8l2-1.5v-4.3l-6.9 2v-2.2l6.9-4.1V4.7c0-1.2.6-2.2 1.6-2.2z" {...TINT} />,
  bicicleta_pe: <>
    <circle cx="5.5" cy="16" r="3.5" /><circle cx="18.5" cy="16" r="3.5" />
    <path d="M5.5 16L9 9.5l2 6.5H5.5M9 9.5h6.5L11 16M15.5 9.5l3 6.5M7.5 8h3M15.5 9.5L14.8 7h2" />
  </>,
  outro: <>
    <circle cx="12" cy="12" r="9" {...TINT} />
    <circle cx="7.8" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="16.2" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </>,
};

export default function Icon({ name, size = 24, className = '', strokeWidth = 2, ...rest }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
      {...rest}
    >
      {ICONS[name] || ICONS.outro}
    </svg>
  );
}
