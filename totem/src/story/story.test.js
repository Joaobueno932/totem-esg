// Arte para stories: em quais eventos aparece, os números que ela mostra e a geometria.
import { describe, expect, it } from 'vitest';
import { formatKmTotal, storyTemplateFor, totalKm } from './templates.js';
import { MAX_ZOOM, SUB_DROP, SUB_SCALE, downscaleFactor, layoutLine, photoRect } from './layout.js';

describe('arte por evento', () => {
  it('Bonito 21K (e variações do slug) tem arte; outros eventos não', () => {
    expect(storyTemplateFor({ slug: 'bonito-21k' })?.id).toBe('bonito21k');
    expect(storyTemplateFor({ slug: 'bonito-21k-2026' })?.id).toBe('bonito21k');
    expect(storyTemplateFor({ slug: 'festa-junina' })).toBeNull();
    expect(storyTemplateFor(null)).toBeNull();
  });

  it('km da arte = deslocamento inteiro informado (ida e volta conta os dois sentidos)', () => {
    const transports = [
      { distance_km: 890, round_trip: true },  // 1.780
      { distance_km: 40, round_trip: false },  // 40
      { distance_km: 0, round_trip: true },    // bicicleta
    ];
    expect(totalKm(transports)).toBe(1820);
    expect(formatKmTotal(1820)).toBe('1.820');
    expect(formatKmTotal(12.6)).toBe('13');
  });
});

describe('foto na janela', () => {
  const win = { x: 108, y: 583, w: 579, h: 737 };

  it('cobre a janela inteira e fica centralizada', () => {
    const r = photoRect(3000, 4000, win);
    expect(r.w).toBeGreaterThanOrEqual(win.w - 0.01);
    expect(r.h).toBeGreaterThanOrEqual(win.h - 0.01);
    expect(r.x + r.w / 2).toBeCloseTo(win.x + win.w / 2);
    expect(r.y + r.h / 2).toBeCloseTo(win.y + win.h / 2);
  });

  it('o arraste nunca deixa a janela descoberta', () => {
    const r = photoRect(3000, 2000, win, 1, 10_000, -10_000); // foto deitada: sobra na horizontal
    expect(r.x).toBeCloseTo(win.x);           // encostou na borda esquerda
    expect(r.y).toBeCloseTo(win.y);           // sem sobra vertical: não mexe
    expect(r.x + r.w).toBeGreaterThanOrEqual(win.x + win.w);
  });

  it('zoom limitado e redução da foto original', () => {
    expect(photoRect(1000, 1000, win, 99).w).toBeCloseTo(photoRect(1000, 1000, win, MAX_ZOOM).w);
    expect(downscaleFactor(4000, 3000, win)).toBeLessThan(1);
    expect(downscaleFactor(300, 300, win)).toBe(1);
  });
});

describe('linhas de texto', () => {
  // fonte "falsa": cada caractere mede 0,6 do tamanho
  const measure = (text, size) => text.length * size * 0.6;
  const spec = { cx: 540, baseline: 476, digitHeight: 47, gap: 31, maxWidth: 940 };

  it('centraliza número + unidade com os dígitos na altura da arte', () => {
    const line = layoutLine([{ text: '1.780', color: 'a' }, { gap: true }, { text: 'KM', color: 'b' }], spec, measure, 0.7);
    expect(line.size).toBeCloseTo(47 / 0.7);
    expect(line.parts[0].x + line.width / 2).toBeCloseTo(540);
    expect(line.parts[1].x).toBeCloseTo(line.parts[0].x + measure('1.780', line.size) + 31);
  });

  it('valor grande encolhe para caber, espaço junto', () => {
    const narrow = { ...spec, maxWidth: 500 };
    const parts = [{ text: '123.456.789', color: 'a' }, { gap: true }, { text: 'KM', color: 'b' }];
    const line = layoutLine(parts, narrow, measure, 0.7);
    expect(line.width).toBeCloseTo(500);
    expect(line.size).toBeLessThan(47 / 0.7);
    expect(line.parts[1].x - line.parts[0].x - measure('123.456.789', line.size)).toBeCloseTo(31 * line.size / (47 / 0.7));
  });

  it('o espaço medido na arte desconta o recuo lateral das letras vizinhas', () => {
    const parts = [{ text: '500', color: 'a' }, { gap: true }, { text: 'KM', color: 'b' }];
    const bearing = (before, after) => (before === '500' && after === 'KM' ? 8 : 0);
    const line = layoutLine(parts, spec, measure, 0.7, bearing);
    expect(line.parts[1].x - line.parts[0].x - measure('500', line.size)).toBeCloseTo(31 - 8);
  });

  it('o 2 do CO₂ sai menor e abaixo da linha de base', () => {
    const line = layoutLine([{ text: 'kgCO', color: 'a' }, { text: '2', color: 'a', sub: true }], spec, measure, 0.7);
    const [main, sub] = line.parts;
    expect(sub.size).toBeCloseTo(main.size * SUB_SCALE);
    expect(sub.y).toBeCloseTo(spec.baseline + main.size * SUB_DROP);
  });
});
