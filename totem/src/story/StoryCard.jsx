import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import StoryEditor from './StoryEditor.jsx';
import { TEMPLATES, drawStory, loadStoryAssets } from './render.js';
import { formatKmTotal, totalKm } from './templates.js';
import { formatKg } from '../emissions/calc.js';
import './story.css';

const THUMB = 0.25; // miniatura: 270×480

// Cartão do resultado com a prévia da arte (já com os números do participante).
// Carregado sob demanda: só eventos com arte baixam este código.
export default function StoryCard({ templateId, result }) {
  const tpl = TEMPLATES[templateId];
  const values = useMemo(() => ({
    km: formatKmTotal(totalKm(result.transports)),
    kg: formatKg(result.total),
  }), [result]);
  const [assets, setAssets] = useState(null);
  const [open, setOpen] = useState(false);
  const canvasRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    let alive = true;
    loadStoryAssets(templateId).then((a) => { if (alive) setAssets(a); }).catch(() => {});
    return () => { alive = false; };
  }, [templateId]);

  useEffect(() => {
    if (!assets || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.setTransform(THUMB, 0, 0, THUMB, 0, 0);
    drawStory(ctx, assets, { photo: null, view: null, ...values });
  }, [assets, values]);

  return (
    <section className="story-card" aria-labelledby="story-card-title">
      <button type="button" className="story-thumb" onClick={() => setOpen(true)} aria-label="Abrir a arte para personalizar">
        <canvas ref={canvasRef} width={tpl.width * THUMB} height={tpl.height * THUMB} />
      </button>
      <div className="story-info">
        <span className="story-kicker"><Icon name="sparkle" size={16} /> Arte para os stories</span>
        <h2 id="story-card-title">{tpl.title}</h2>
        <p>Coloque sua foto e compartilhe sua pegada nas redes.</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
          <Icon name="image" size={20} /> Criar minha arte
        </button>
      </div>
      {open && <StoryEditor templateId={templateId} values={values} onClose={close} />}
    </section>
  );
}
