import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../components/Icon.jsx';
import { MAX_ZOOM, MIN_ZOOM, photoRect } from './layout.js';
import { drawStory, loadPhoto, loadStoryAssets } from './render.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function canShareFiles() {
  try {
    return !!navigator.canShare?.({ files: [new File(['x'], 'x.jpg', { type: 'image/jpeg' })] });
  } catch {
    return false;
  }
}

// Editor em tela cheia: o participante põe uma foto (câmera ou galeria), ajusta
// arrastando/pinçando e baixa ou compartilha a arte. A imagem final é gerada no
// aparelho; nada é enviado ao servidor.
export default function StoryEditor({ templateId, values, onClose }) {
  const [assets, setAssets] = useState(null);
  const [error, setError] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [file, setFile] = useState(null);
  const [notice, setNotice] = useState(null);
  const [shareFiles] = useState(canShareFiles);

  const canvasRef = useRef(null);
  const closeRef = useRef(null);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const viewRef = useRef({ zoom: 1, dx: 0, dy: 0 });
  const pointers = useRef(new Map());
  const frame = useRef(0);
  const exportTimer = useRef(0);

  useEffect(() => {
    let alive = true;
    loadStoryAssets(templateId)
      .then((a) => { if (alive) setAssets(a); })
      .catch(() => { if (alive) setError('Não foi possível preparar a arte. Confira a conexão e tente de novo.'); });
    return () => { alive = false; };
  }, [templateId]);

  // Modal: trava a rolagem, tira o resto da página do alcance (inert), fecha no Esc
  // e devolve o foco a quem abriu.
  useEffect(() => {
    const opener = document.activeElement;
    const root = document.getElementById('root');
    const { overflow } = document.documentElement.style;
    document.documentElement.style.overflow = 'hidden';
    root?.setAttribute('inert', '');
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = overflow;
      root?.removeAttribute('inert');
      window.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  useEffect(() => () => {
    cancelAnimationFrame(frame.current);
    clearTimeout(exportTimer.current);
  }, []);

  // Redesenha no próximo quadro. A imagem final (JPEG) é gerada logo depois do último
  // ajuste, para o "Compartilhar" chamar navigator.share já no toque — o iOS recusa
  // compartilhar se houver espera entre o toque e o pedido.
  const draw = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas || !assets) return;
      drawStory(canvas.getContext('2d'), assets, { photo, view: viewRef.current, ...values });
      setFile(null);
      clearTimeout(exportTimer.current);
      exportTimer.current = setTimeout(() => {
        canvas.toBlob((blob) => {
          if (blob) setFile(new File([blob], assets.tpl.fileName, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.92);
      }, 250);
    });
  }, [assets, photo, values]);

  useEffect(() => { draw(); }, [draw]);

  function clampView() {
    if (!photo || !assets) return;
    const v = viewRef.current;
    const r = photoRect(photo.width, photo.height, assets.tpl.window, v.zoom, v.dx, v.dy);
    v.dx = r.dx;
    v.dy = r.dy;
  }

  function setZoomTo(z) {
    viewRef.current.zoom = clamp(z, MIN_ZOOM, MAX_ZOOM);
    setZoom(viewRef.current.zoom);
    clampView();
    draw();
  }

  // posição do ponteiro em px da arte (só as diferenças importam)
  function toArt(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const k = assets.tpl.width / rect.width;
    return { x: e.clientX * k, y: e.clientY * k };
  }

  function onPointerDown(e) {
    if (!photo) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, toArt(e));
  }

  // um dedo arrasta; dois dedos aproximam/afastam (zoom) e arrastam juntos
  function onPointerMove(e) {
    const map = pointers.current;
    const prev = map.get(e.pointerId);
    if (!prev) return;
    const now = toArt(e);
    const v = viewRef.current;
    if (map.size === 1) {
      v.dx += now.x - prev.x;
      v.dy += now.y - prev.y;
    } else {
      const other = [...map.entries()].find(([id]) => id !== e.pointerId)?.[1];
      if (other) {
        const before = Math.hypot(prev.x - other.x, prev.y - other.y);
        const after = Math.hypot(now.x - other.x, now.y - other.y);
        if (before > 0) {
          v.zoom = clamp(v.zoom * (after / before), MIN_ZOOM, MAX_ZOOM);
          setZoom(v.zoom);
        }
      }
      v.dx += (now.x - prev.x) / 2;
      v.dy += (now.y - prev.y) / 2;
    }
    map.set(e.pointerId, now);
    clampView();
    draw();
  }

  function onPointerUp(e) {
    pointers.current.delete(e.pointerId);
  }

  function onWheel(e) {
    if (photo) setZoomTo(viewRef.current.zoom * Math.exp(-e.deltaY * 0.0015));
  }

  async function onFile(e) {
    const picked = e.target.files?.[0];
    e.target.value = ''; // escolher a mesma foto de novo também dispara
    if (!picked || !assets) return;
    if (picked.type && !picked.type.startsWith('image/')) {
      setNotice('Escolha um arquivo de imagem.');
      return;
    }
    setNotice(null);
    setLoadingPhoto(true);
    try {
      const img = await loadPhoto(picked, assets.tpl.window);
      viewRef.current = { zoom: 1, dx: 0, dy: 0 };
      setZoom(1);
      setPhoto(img);
    } catch {
      setNotice('Não foi possível abrir essa imagem. Tente outra foto (JPG ou PNG).');
    } finally {
      setLoadingPhoto(false);
    }
  }

  function removePhoto() {
    setPhoto(null);
    viewRef.current = { zoom: 1, dx: 0, dy: 0 };
    setZoom(1);
  }

  function download() {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    setNotice(isIOS()
      ? 'Imagem baixada para Arquivos › Downloads. Para salvar direto nas Fotos, use Compartilhar › Salvar imagem.'
      : 'Imagem baixada.');
  }

  async function share() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: assets.tpl.title, text: assets.tpl.shareText });
    } catch (err) {
      if (err?.name !== 'AbortError') download(); // app sem suporte a arquivo: baixa
    }
  }

  const ready = !!assets && !error;

  return createPortal(
    <div className="story-editor" role="dialog" aria-modal="true" aria-labelledby="story-editor-title">
      <header className="story-head">
        <h2 id="story-editor-title">{assets?.tpl.title || 'Sua arte'}</h2>
        <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
          <Icon name="x" />
        </button>
      </header>

      <div className="story-stage">
        {error && <p className="story-error" role="alert">{error}</p>}
        {!assets && !error && <span className="spinner spinner-lg" aria-label="Preparando a arte" />}
        <canvas
          ref={canvasRef} width={1080} height={1920} hidden={!ready}
          className={`story-canvas${photo ? ' can-move' : ''}`}
          role="img" aria-label={`Arte com ${values.km} km e ${values.kg} kg de CO₂e${photo ? ', com a sua foto' : ''}`}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel}
        />
        {loadingPhoto && <span className="story-loading"><span className="spinner" aria-hidden="true" /> Abrindo a foto…</span>}
      </div>

      <div className="story-controls">
        <div className="story-row">
          <button type="button" className="btn btn-light" disabled={!ready} onClick={() => cameraRef.current?.click()}>
            <Icon name="camera" /> Tirar foto
          </button>
          <button type="button" className="btn btn-light" disabled={!ready} onClick={() => galleryRef.current?.click()}>
            <Icon name="image" /> Galeria
          </button>
        </div>

        {photo && (
          <div className="story-zoom">
            <Icon name="minus" size={18} />
            <input
              type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} value={zoom}
              onChange={(e) => setZoomTo(Number(e.target.value))} aria-label="Zoom da foto"
            />
            <Icon name="plus" size={18} />
            <button type="button" className="btn-link story-remove" onClick={removePhoto}>Remover</button>
          </div>
        )}

        <p className="story-hint">
          {photo ? 'Arraste para ajustar a foto; com dois dedos, aproxime. ' : ''}
          Sua foto fica só no seu celular — nada é enviado.
        </p>
        {notice && <p className="story-notice" role="status">{notice}</p>}

        <div className="story-row">
          <button type="button" className={`btn ${shareFiles ? 'btn-ghost' : 'btn-primary'}`} disabled={!file} onClick={download}>
            <Icon name="download" /> Baixar
          </button>
          {shareFiles && (
            <button type="button" className="btn btn-primary" disabled={!file} onClick={share}>
              <Icon name="share" /> Compartilhar
            </button>
          )}
        </div>
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onFile} />
      <input ref={galleryRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onFile} />
    </div>,
    document.body,
  );
}
