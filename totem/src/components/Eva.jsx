// Eva, a capivara guia do Pegada de Carbono. As imagens são as artes oficiais
// (brand/eva/*.png) recortadas da cabeça ao quadril e convertidas para WebP; todas
// na mesma escala, então a Eva não muda de tamanho entre as telas.
import { useEffect } from 'react';
import acenando from '../assets/eva/eva-acenando.webp';
import apresentando from '../assets/eva/eva-apresentando.webp';
import ideia from '../assets/eva/eva-ideia.webp';
import pensativa from '../assets/eva/eva-pensativa.webp';
import mostrando from '../assets/eva/eva-mostrando.webp';
import comemorando from '../assets/eva/eva-comemorando.webp';

// width/height reais de cada arquivo: o navegador reserva o espaço antes de carregar
export const POSES = {
  acenando: { src: acenando, width: 434, height: 532 },
  apresentando: { src: apresentando, width: 373, height: 532 },
  ideia: { src: ideia, width: 429, height: 532 },
  pensativa: { src: pensativa, width: 368, height: 532 },
  mostrando: { src: mostrando, width: 484, height: 532 },
  comemorando: { src: comemorando, width: 497, height: 547 },
};

// Decodifica as poses com antecedência para a troca de etapa não piscar.
export function usePreloadPoses() {
  useEffect(() => {
    const run = () => Object.values(POSES).forEach(({ src }) => { new Image().src = src; });
    const id = 'requestIdleCallback' in window ? window.requestIdleCallback(run) : setTimeout(run, 800);
    return () => ('cancelIdleCallback' in window ? window.cancelIdleCallback(id) : clearTimeout(id));
  }, []);
}

export function Eva({ pose, className = '', priority = false }) {
  const p = POSES[pose] || POSES.acenando;
  return (
    <img
      className={`eva ${className}`}
      src={p.src} width={p.width} height={p.height}
      alt="" decoding="async" fetchpriority={priority ? 'high' : undefined}
      draggable="false"
    />
  );
}

// Eva + balão de fala. O balão é anunciado por leitores de tela quando muda
// (mensagens de validação também passam por ele).
export function EvaGuide({ pose, title, text, variant = '' }) {
  return (
    <div className={`guide ${variant}`}>
      <Eva pose={pose} className="guide-eva" priority />
      <div className="bubble-wrap" aria-live="polite">
        <div className="bubble" key={`${pose}|${title}`}>
          <p className="bubble-title">{title}</p>
          {text && <p className="bubble-text">{text}</p>}
        </div>
      </div>
    </div>
  );
}
