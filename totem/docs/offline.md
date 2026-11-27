# Funcionamento offline

O totem é **offline-first**: depois de carregado uma vez com internet, todo o
fluxo do participante funciona sem rede — inclusive o cálculo de CO₂e.

## As três camadas

### 1. Service Worker — o app abre sem internet

O build do totem (via `vite-plugin-pwa`/Workbox) pré-cacheia **todos** os
arquivos do app (HTML, JS, CSS, ícones). Ao abrir a URL, o Service Worker serve
tudo do cache local, com ou sem rede. Atualizações do app são baixadas em
segundo plano quando houver internet (`registerType: autoUpdate`).

### 2. IndexedDB (Dexie) — nada se perde

Cada resposta finalizada vira um registro na tabela `answers` do banco local
`carbono-zero-totem`, com:

- `local_uuid` — UUID v4 gerado no dispositivo (chave de deduplicação global);
- payload completo (participante + lista de trechos de transporte, cada um com
  sua emissão calculada + versão dos fatores);
- `status`: `pending` → `synced`.

O backend aceita tanto o formato atual (`transports: [...]`) quanto o antigo
(`transport: {...}`), então um totem que ficou offline antes da atualização
sincroniza normalmente a fila que acumulou.

O IndexedDB é persistente: fechar o navegador, recarregar a página ou cair a
energia **não** apaga a fila. Além disso, o formulário em andamento é salvo em
`localStorage` como rascunho — se a página recarregar no meio do preenchimento,
o participante continua de onde parou.

### 3. Fila de sincronização — envio automático

A sincronização (`src/sync.js`) tenta enviar as respostas `pending` para
`POST /api/sync/answers`:

- imediatamente após cada resposta;
- quando o navegador dispara o evento `online`;
- a cada 60 segundos.

Regras:

- **Sucesso** → resposta marcada como `synced` (e apagada após 7 dias, por
  minimização de dados/LGPD).
- **Falha de rede/servidor** → nada muda; os dados continuam `pending` e serão
  reenviados na próxima tentativa. Não há limite de tentativas.
- **Duplicidade** → o servidor tem índice único em `local_uuid`; reenvios
  retornam `duplicate` e o cliente marca como sincronizado. Enviar duas vezes
  nunca duplica dados.
- **Resposta inválida** (não deveria ocorrer com o app oficial) → o servidor
  registra o erro em `sync_logs` e o cliente remove da fila para não travar as
  demais.

## Monitoramento

- **No totem**: a tela inicial mostra o estado da conexão e quantas respostas
  aguardam envio. A fila sincroniza sozinha (ao voltar a conexão, a cada 60 s e
  após cada resposta).
- **No dashboard**: a página **Sincronização** lista tudo que chegou ao
  servidor (`ok`, `duplicate`, `recalculated`, `error`) com mensagens de erro.

## Cuidados operacionais

- Carregue o app **uma vez com internet** antes do evento (é isso que instala o
  Service Worker).
- Não use aba anônima/convidado: o IndexedDB é apagado ao fechar.
- Não limpe dados de navegação do dispositivo enquanto houver respostas
  pendentes.
- PWA exige **HTTPS** (ou `localhost` em desenvolvimento).
