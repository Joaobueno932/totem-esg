// Busca de município usada no campo "Cidade de origem".
import { describe, expect, it } from 'vitest';
import { UFS, UF_NAMES, cityCoords, matchCity, searchCities } from './cities.js';

describe('cidades', () => {
  it('toda UF da base tem nome para exibição', () => {
    expect(UFS).toHaveLength(27);
    expect(UFS.every((uf) => UF_NAMES[uf])).toBe(true);
  });

  it('busca ignora acento e caixa e prioriza quem começa com o texto', () => {
    expect(searchCities('MS', 'campo')[0]).toBe('Campo Grande');
    expect(searchCities('MS', 'AGUA')).toContain('Água Clara');
    expect(searchCities('MS', 'zzz')).toEqual([]);
    expect(searchCities('', 'campo')).toEqual([]);
  });

  it('texto exato vira o nome oficial; parcial não', () => {
    expect(matchCity('MS', 'agua clara')).toBe('Água Clara');
    expect(matchCity('MS', 'campo')).toBeNull();
    expect(matchCity('MS', '  ')).toBeNull();
  });

  it('coordenadas aceitam sufixo de UF (cidade do evento vinda do CEP)', () => {
    expect(cityCoords('MS', 'Campo Grande - MS')).toEqual(cityCoords('MS', 'Campo Grande'));
    expect(cityCoords('MS', 'Campo Grande')).toHaveLength(2);
  });
});
