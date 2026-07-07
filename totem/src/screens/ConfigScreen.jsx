import { useState } from 'react';
import { getConfig, saveConfig } from '../config.js';
import { pendingCount } from '../db.js';
import { trySync } from '../sync.js';
import { useEffect } from 'react';

// Tela restrita à equipe do evento (não aparece no fluxo do participante).
export default function ConfigScreen({ onDone }) {
  const [cfg, setCfg] = useState(getConfig());
  const [pending, setPending] = useState(0);
  const [msg, setMsg] = useState('');

  useEffect(() => { pendingCount().then(setPending); }, []);

  function save(e) {
    e.preventDefault();
    if (!cfg.eventId || !cfg.apiUrl) {
      setMsg('Informe o ID do evento e a URL da API.');
      return;
    }
    saveConfig({ ...cfg, eventId: Number(cfg.eventId) });
    onDone();
  }

  async function forceSync() {
    setMsg('Sincronizando…');
    await trySync();
    const left = await pendingCount();
    setPending(left);
    setMsg(left === 0 ? 'Tudo sincronizado ✓' : `${left} respostas ainda pendentes.`);
  }

  return (
    <form className="screen form config" onSubmit={save}>
      <h2>⚙️ Configuração do totem</h2>
      <p className="config-note">Área da equipe organizadora. O participante não vê esta tela.</p>

      <label>
        ID do evento (do dashboard)*
        <input value={cfg.eventId || ''} onChange={(e) => setCfg({ ...cfg, eventId: e.target.value })} inputMode="numeric" />
      </label>
      <label>
        Nome do evento (exibido na tela inicial)
        <input value={cfg.eventName} onChange={(e) => setCfg({ ...cfg, eventName: e.target.value })} maxLength={120} />
      </label>
      <label>
        URL da API*
        <input value={cfg.apiUrl} onChange={(e) => setCfg({ ...cfg, apiUrl: e.target.value })} placeholder="https://api.seudominio.com.br" />
      </label>

      <p className="config-note">
        Respostas pendentes de sincronização: <strong>{pending}</strong>
      </p>
      {msg && <p className="config-note">{msg}</p>}

      <div className="nav-buttons">
        <button type="button" className="btn-secondary" onClick={forceSync}>Sincronizar agora</button>
        <button type="submit" className="btn-primary">Salvar e iniciar</button>
      </div>
    </form>
  );
}
