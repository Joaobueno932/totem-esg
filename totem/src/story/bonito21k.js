import base from '../assets/story/bonito21k-base.webp';

// Arte de stories do Bonito 21K (original em brand/arte-stories-bonito21k.png).
// A base é a arte original sem os "000", sem o "Sua foto aqui" e com a janela da
// foto transparente — a foto entra por baixo e o crachá continua por cima dela.
// Todas as medidas são em px da arte (1080×1920), tiradas da original.
export default {
  id: 'bonito21k',
  title: 'Sua arte do Bonito 21K',
  width: 1080,
  height: 1920,
  base,
  fileName: 'pegada-de-carbono-bonito21k.jpg',
  shareText: 'Minha pegada de carbono no Bonito 21K. #Bonito21k #PegadaDeCarbonoFIEMS',
  window: { x: 108, y: 583, w: 579, h: 737 },
  font: 'Montserrat',
  weight: 900,
  sub: { font: 'Poppins', weight: 500 }, // "2" do CO₂, traço fino como na original
  // "PERCORRI 000 KM": dígitos com 47 px, número azul e "KM" rosa
  km: { cx: 540, baseline: 476, digitHeight: 47, gap: 31, maxWidth: 940, color: '#10286b', unitColor: '#d83c8b' },
  // "000 kgCO₂e" na caixa azul
  kg: { cx: 540, baseline: 1512, digitHeight: 51, gap: 33, maxWidth: 700, color: '#b8f500' },
};
