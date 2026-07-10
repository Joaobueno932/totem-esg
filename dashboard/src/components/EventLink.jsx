import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Mostra o link do totem para o evento e o QR code correspondente, com botões de
// copiar o link e baixar o QR em PNG (para imprimir/divulgar).
export default function EventLink({ url, filename }) {
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 320, margin: 1 })
      .then(setQr)
      .catch(() => setQr(''));
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard bloqueado: usuário copia manualmente */ }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start rounded-lg bg-emerald-50 p-4">
      {qr && <img src={qr} alt="QR code do evento" width={140} height={140} className="rounded bg-white p-1" />}
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs text-(--ink-2)">Link do totem para este evento:</p>
        <a href={url} target="_blank" rel="noreferrer"
          className="block break-all font-mono text-sm text-emerald-800 hover:underline">{url}</a>
        <div className="flex gap-2 flex-wrap">
          <button onClick={copy}
            className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm hover:bg-black/5">
            {copied ? 'Copiado ✓' : 'Copiar link'}
          </button>
          {qr && (
            <a href={qr} download={`${filename}-qr.png`}
              className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm hover:bg-black/5">
              Baixar QR (PNG)
            </a>
          )}
        </div>
        <p className="text-xs text-(--muted)">
          Os participantes escaneiam este QR no evento para abrir o totem já no evento certo.
        </p>
      </div>
    </div>
  );
}
