# Pegada de Carbono — Totem (PWA)

App do participante, usado em totens/quiosques e no celular a partir do link ou QR
code de cada evento (`https://<totem>/<slug-do-evento>`). Coleta os dados pessoais
(com aceite LGPD) e os trechos de deslocamento, e calcula a emissão de CO₂e
**localmente**. As respostas ficam numa fila no IndexedDB e são sincronizadas com a
API quando há internet. O app é **offline-first**: depois do primeiro acesso, abre e
funciona sem rede. Detalhes em [`docs/offline.md`](docs/offline.md).

## Stack

| Item | Versão |
|---|---|
| React | 18.3 |
| Vite | 5.4 · `vite-plugin-pwa` 0.20 (Workbox, service worker) |
| Dexie | 4 (fila local em IndexedDB) |
| Servidor da imagem | nginx 1.30 sem root (`nginxinc/nginx-unprivileged`) |
| Qualidade | ESLint 10 · Vitest 3 |
| Node.js (build) | 24 LTS (mínimo 22) |

## Variáveis

Nenhuma é segredo. As `VITE_*` entram no JavaScript entregue ao navegador.

| Variável | Quando | Padrão | Uso |
|---|---|---|---|
| `VITE_API_URL` | build | vazio = mesma origem | URL da API, só quando ela está em outro domínio e sem proxy |
| `VITE_ALLOW_API_OVERRIDE` | build | `true` (`false` na imagem Docker) | aceitar a URL da API vinda do link (`?api=`) e guardada em cache |
| `API_PROXY_TARGET` | dev/preview | `http://localhost:3001` | para onde o Vite encaminha `/api` |
| `BACKEND_URL` | execução (contêiner) | — (**obrigatória**) | endereço interno da API para o proxy do nginx, sem caminho |

Com `VITE_ALLOW_API_OVERRIDE=false` a API é fixa. Assim um link adulterado
(`?api=https://outro-servidor`) não consegue desviar respostas, que contêm dados
pessoais, nem gravar esse endereço no cache do dispositivo. A imagem Docker já usa
`false`.

## Desenvolvimento local

Pré-requisitos: Node.js 22+ e o backend rodando (veja o README do repositório
backend). Por padrão a API é esperada em `http://localhost:3001`.

```bash
npm install
npm run dev            # http://localhost:5173/<slug-do-evento>
```

O navegador chama `/api/...` no próprio host do totem e o Vite encaminha ao backend,
o mesmo papel do nginx em produção. Se a API estiver em outra porta, use
`API_PROXY_TARGET=http://localhost:13001 npm run dev`. O slug aparece no cadastro do
evento, no dashboard.

O service worker só existe no build. Para testar o modo offline de verdade:

```bash
npm run build && npm run preview      # http://localhost:4173/<slug>
```

## Testes e build

```bash
npm run lint
npm test               # cálculo de emissões e resolução da URL da API
npm run build          # gera dist/ (app + service worker)
```

## Docker

```bash
docker build -t totem-esg-totem .
docker run -p 8080:8080 -e BACKEND_URL=http://<host-da-api>:3001 totem-esg-totem
```

- Multi-stage: build com Node e entrega com nginx sem root (UID 101, porta 8080).
  Compatível com `readOnlyRootFilesystem` se `/tmp` e `/etc/nginx/conf.d` forem
  graváveis (`emptyDir`).
- Na inicialização, `BACKEND_URL` é validada e a configuração do nginx é gerada a
  partir de [`nginx/default.conf.template`](nginx/default.conf.template). Sem a
  variável, o contêiner não sobe e mostra a mensagem de erro.
- `GET /healthz` é a sonda do contêiner e não depende da API.
- Cache: `/assets/*` (nome com hash) é imutável. `index.html`, `sw.js` e o manifest
  sempre revalidam, para o PWA receber atualizações.
- Imagens base de espelho interno: `--build-arg NODE_IMAGE=...` e `--build-arg NGINX_IMAGE=...`.

## Comunicação com a API

O nginx da imagem funciona como proxy reverso (BFF): o navegador fala só com a origem
do totem, e a API pode ficar interna ao cluster (Service `ClusterIP`). Apenas as rotas
que o totem usa são encaminhadas:

| Rota | Uso |
|---|---|
| `GET /api/public/events/{slug}` | resolve o evento do link (e guarda em cache para abrir offline) |
| `POST /api/sync/answers` | envia a fila local (idempotente por `local_uuid`) |
| `GET /api/health` | sonda |

Qualquer outra rota `/api/*` responde 404 por aqui. As rotas administrativas não
ficam expostas no domínio público do totem. O contrato completo está no
`openapi.yaml` do repositório backend. Não há segredos no frontend: as rotas acima
são públicas e têm rate limit no servidor.

O cálculo usa os fatores embarcados em `src/emissions/factors.json`, uma cópia do
seed do backend (`seeds/emission_factors.json`). O servidor recalcula cada resposta e
o valor dele prevalece. Ao atualizar os fatores, publique a mesma versão nos dois
repositórios.

## Implantação (Azure DevOps → ACR → Argo CD)

- **Pipeline** ([`azure-pipelines.yml`](azure-pipelines.yml)): dispara só com
  mudanças em `totem/`, nas branches `dev`/`main` e em PRs para elas. Faz lint,
  testes, build e imagem. Em PR a imagem é só construída. Em `dev`/`main` ela vai
  para o ACR com as tags `<versão>-<branch>.<BuildId>` e `sha-<commit>`.
- **Kubernetes** ([`deploy/k8s`](deploy/k8s)): manifests de referência (Kustomize,
  overlays `hml`/`prd`). Usa `BACKEND_URL=http://totem-esg-backend` (Service da API
  no mesmo namespace; em outro namespace, use o FQDN `…svc.cluster.local`). O Service
  da API precisa existir antes do totem subir, porque o nginx resolve o nome na
  inicialização.
- **Exposição**: o totem é público e precisa de HTTPS, sem o qual não há service
  worker nem PWA. O ingress/gateway corporativo não está nestes manifests.

### Pendências de infraestrutura

- service connection do ACR, pool de agentes, nome do ACR e namespaces (`__PREENCHER_*__`);
- domínio público com TLS e regra de ingress/gateway para o Service `totem-esg-totem`;
- espelho das imagens base se o Docker Hub for bloqueado;
- atualização da tag no repositório GitOps (padrão corporativo).

## Outros

- `scripts/fetch-cities.mjs` regenera `src/data/cities.json` (municípios do IBGE com
  coordenadas, usados para estimar a distância offline). Precisa de internet. Atrás de
  proxy corporativo, use `node --use-system-ca scripts/fetch-cities.mjs`.
- `netlify.toml` e `vercel.json` servem às hospedagens estáticas atuais e não são
  usados no Azure.
