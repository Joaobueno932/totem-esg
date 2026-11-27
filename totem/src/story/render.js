// Desenho da arte em canvas. Tudo acontece no aparelho: a foto do participante
// nunca sai dele.
import { downscaleFactor, layoutLine, photoRect } from './layout.js';
import bonito21k from './bonito21k.js';
import evaComemorando from '../assets/eva/eva-comemorando.webp';

export const TEMPLATES = { bonito21k };

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Imagem não carregou'));
    img.src = src;
  });
}

// Base, Eva (para quando ainda não há foto) e a fonte dos números, carregadas uma vez.
const cache = new Map();
export function loadStoryAssets(id) {
  if (!cache.has(id)) {
    const tpl = TEMPLATES[id];
    const job = Promise.all([
      loadImage(tpl.base),
      loadImage(evaComemorando),
      // sem isso o canvas desenharia os números na fonte padrão
      document.fonts.load(`${tpl.weight} 64px "${tpl.font}"`, '0123456789.,KMkgCOe'),
      document.fonts.load(`${tpl.sub.weight} 32px "${tpl.sub.font}"`, '2'),
    ]).then(([base, eva]) => ({ tpl, base, eva }));
    job.catch(() => cache.delete(id)); // falhou (ex.: offline no primeiro acesso): tenta de novo depois
    cache.set(id, job);
  }
  return cache.get(id);
}

// Foto escolhida pelo participante. O navegador já aplica a orientação EXIF; a imagem
// é reduzida ao necessário para o zoom máximo, para não pesar na memória do celular.
export async function loadPhoto(file, win) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const k = downscaleFactor(img.naturalWidth, img.naturalHeight, win);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// o "2" do CO₂ usa um traço mais fino, como na arte original
const font = (tpl, size, sub = false) => (sub
  ? `${tpl.sub.weight} ${size}px "${tpl.sub.font}"`
  : `${tpl.weight} ${size}px "${tpl.font}"`);

function drawLine(ctx, tpl, spec, parts) {
  ctx.font = font(tpl, 100);
  const digitRatio = ctx.measureText('0').actualBoundingBoxAscent / 100;
  const measure = (text, size, sub) => {
    ctx.font = font(tpl, size, sub);
    return ctx.measureText(text).width;
  };
  // recuo à direita da última letra antes do espaço + recuo à esquerda da primeira depois
  const bearing = (before, after, size) => {
    ctx.font = font(tpl, size);
    const a = ctx.measureText(before.slice(-1));
    const b = ctx.measureText(after.slice(0, 1));
    return (a.width - a.actualBoundingBoxRight) - b.actualBoundingBoxLeft;
  };
  const line = layoutLine(parts, spec, measure, digitRatio, bearing);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (const p of line.parts) {
    ctx.font = font(tpl, p.size, p.sub);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  }
}

// Arte completa em coordenadas da arte (1080×1920; o contexto pode estar escalado).
// Sem foto, a Eva comemorando ocupa a janela.
export function drawStory(ctx, { tpl, base, eva }, { photo, view, km, kg }) {
  const win = tpl.window;
  ctx.clearRect(0, 0, tpl.width, tpl.height);

  ctx.save();
  ctx.beginPath();
  ctx.rect(win.x, win.y, win.w, win.h);
  ctx.clip();
  if (photo) {
    const r = photoRect(photo.width, photo.height, win, view.zoom, view.dx, view.dy);
    ctx.drawImage(photo, r.x, r.y, r.w, r.h);
  } else {
    const g = ctx.createLinearGradient(0, win.y, 0, win.y + win.h);
    g.addColorStop(0, '#f1f9f4');
    g.addColorStop(1, '#cdebd9');
    ctx.fillStyle = g;
    ctx.fillRect(win.x, win.y, win.w, win.h);
    const w = win.w * 0.9;
    const h = (w * eva.height) / eva.width;
    ctx.drawImage(eva, win.x + (win.w - w) / 2, win.y + win.h - h, w, h);
  }
  ctx.restore();

  ctx.drawImage(base, 0, 0, tpl.width, tpl.height);

  drawLine(ctx, tpl, tpl.km, [
    { text: km, color: tpl.km.color }, { gap: true }, { text: 'KM', color: tpl.km.unitColor },
  ]);
  const c = tpl.kg.color;
  drawLine(ctx, tpl, tpl.kg, [
    { text: kg, color: c }, { gap: true }, { text: 'kgCO', color: c }, { text: '2', color: c, sub: true }, { text: 'e', color: c },
  ]);
}
