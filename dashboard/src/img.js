// Reduz a imagem escolhida no navegador antes de enviar: a imagem do evento vai
// como data URL base64 no banco, então limitamos dimensão e qualidade para o payload
// ficar pequeno (o backend rejeita acima de ~1,5 MB).
const MAX_DIM = 1000;
const QUALITY = 0.82;

export function fileToScaledDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Selecione um arquivo de imagem.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        // PNG com transparência viraria fundo preto em JPEG; mantém PNG se houver alfa no tipo original
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(mime, QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
