// Reduz a imagem escolhida no navegador antes de enviar: a imagem do evento vai
// como data URL base64 no banco, então limitamos dimensão e qualidade para o payload
// ficar pequeno (o backend rejeita acima de ~1,5 MB).
const MAX_DIM = 1000;
const QUALITY = 0.82;
const MAX_BYTES = 1.4 * 1024 * 1024; // folga sobre o limite do backend (1,5 MB)

const dataUrlBytes = (url) => Math.floor((url.length - (url.indexOf(',') + 1)) * 0.75);

function draw(img, dim, mime, quality) {
  const scale = Math.min(1, dim / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  // JPEG não tem alfa: pinta o fundo de branco para a transparência não virar preto.
  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(mime, quality);
}

export function fileToScaledDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Selecione um arquivo de imagem.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida.'));
      img.onload = () => {
        // PNG com transparência é mantido enquanto couber no limite; um PNG grande
        // (foto, arte com muitos tons) estoura fácil os 1,5 MB, então cai para JPEG
        // e, se ainda assim for grande, vai reduzindo dimensão e qualidade.
        const keepPng = file.type === 'image/png';
        let out = draw(img, MAX_DIM, keepPng ? 'image/png' : 'image/jpeg', QUALITY);
        if (dataUrlBytes(out) > MAX_BYTES && keepPng) out = draw(img, MAX_DIM, 'image/jpeg', QUALITY);

        let dim = MAX_DIM;
        let quality = QUALITY;
        while (dataUrlBytes(out) > MAX_BYTES && dim > 320) {
          dim = Math.round(dim * 0.8);
          quality = Math.max(0.6, quality - 0.05);
          out = draw(img, dim, 'image/jpeg', quality);
        }
        if (dataUrlBytes(out) > MAX_BYTES) {
          return reject(new Error('Imagem muito pesada mesmo após compressão. Use um arquivo menor.'));
        }
        resolve(out);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
