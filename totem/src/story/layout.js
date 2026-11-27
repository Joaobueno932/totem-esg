// Geometria da arte, sem canvas: posição da foto na janela e montagem das linhas de texto.

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

// Foto em "cover" na janela, com zoom ≥ 1 e deslocamento (dx, dy, em px da arte)
// limitado para a foto nunca deixar a janela vazia. Devolve o retângulo e o
// deslocamento já limitado.
export function photoRect(iw, ih, win, zoom = 1, dx = 0, dy = 0) {
  const s = Math.max(win.w / iw, win.h / ih) * clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const w = iw * s;
  const h = ih * s;
  const maxX = (w - win.w) / 2;
  const maxY = (h - win.h) / 2;
  const cx = clamp(dx, -maxX, maxX);
  const cy = clamp(dy, -maxY, maxY);
  return { x: win.x + win.w / 2 - w / 2 + cx, y: win.y + win.h / 2 - h / 2 + cy, w, h, dx: cx, dy: cy };
}

// Fator para reduzir a foto original sem perder nitidez no zoom máximo
// (fotos de 12 MP ocupariam memória à toa num celular).
export function downscaleFactor(iw, ih, win) {
  return Math.min(1, Math.max(win.w / iw, win.h / ih) * MAX_ZOOM);
}

// subscrito do CO₂ (medido na arte): ~45% do tamanho e um pouco abaixo da linha de base
export const SUB_SCALE = 0.45;
export const SUB_DROP = 0.12;

// Monta uma linha centralizada a partir de trechos com cores diferentes.
// A fonte é escolhida para os dígitos terem spec.digitHeight px (digitRatio = altura
// do "0" ÷ tamanho da fonte) e encolhe se a linha passar de spec.maxWidth.
// spec.gap é o espaço de tinta entre número e unidade, medido na arte: bearing(antes,
// depois, size) desconta o recuo lateral das letras vizinhas, que a largura já inclui.
// part: { text, color, sub?: true } | { gap: true }; measure(text, size, sub) → largura
export function layoutLine(parts, spec, measure, digitRatio, bearing = () => 0) {
  const nominal = spec.digitHeight / digitRatio;
  const gapAt = (i, size) => spec.gap * (size / nominal) - bearing(parts[i - 1]?.text || '', parts[i + 1]?.text || '', size);
  const partWidth = (p, i, size) => (p.gap ? gapAt(i, size) : measure(p.text, p.sub ? size * SUB_SCALE : size, !!p.sub));
  const width = (size) => parts.reduce((sum, p, i) => sum + partWidth(p, i, size), 0);
  let size = nominal;
  const natural = width(size);
  if (natural > spec.maxWidth) size *= spec.maxWidth / natural;
  const total = width(size);

  let x = spec.cx - total / 2;
  const placed = [];
  parts.forEach((p, i) => {
    if (!p.gap) {
      placed.push({
        text: p.text, color: p.color, x, sub: !!p.sub,
        y: spec.baseline + (p.sub ? size * SUB_DROP : 0),
        size: p.sub ? size * SUB_SCALE : size,
      });
    }
    x += partWidth(p, i, size);
  });
  return { size, width: total, parts: placed };
}
