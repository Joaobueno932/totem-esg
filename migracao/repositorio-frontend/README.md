# Pegada de Carbono — Frontend

Repositório dos dois clientes web do sistema Pegada de Carbono. Cada pasta é uma
aplicação independente, com dependências, testes, `Dockerfile`, pipeline do Azure
DevOps e manifests Kubernetes próprios:

| Pasta | Aplicação | Público |
|---|---|---|
| [`totem/`](totem/README.md) | PWA offline-first do participante (link/QR de cada evento) | público, HTTPS |
| [`dashboard/`](dashboard/README.md) | painel administrativo com login | equipe interna |
| `brand/` | arte original da marca (as cópias usadas ficam em `*/public/`) | — |

As duas dependem apenas do contrato HTTP da API, que fica no repositório **backend**
(`openapi.yaml`). Nenhuma delas acessa o banco nem guarda segredos.

## Como as peças se conectam

```
navegador ──HTTPS──> ingress/gateway ──> nginx do totem ─────┐  /api/public, /api/sync
                                     └─> nginx do dashboard ─┤  /api/*
                                                             └──> API (Service ClusterIP) ──> PostgreSQL
```

Cada frontend chama a API na **própria origem** (`/api/...`). O nginx da imagem
encaminha para `BACKEND_URL`, então o navegador nunca precisa alcançar a API
diretamente e o CORS não entra em jogo. Em desenvolvimento, o Vite faz o mesmo papel.

## Início rápido

Com o backend rodando em `http://localhost:3001` (veja o README do backend):

```bash
cd totem && npm install && npm run dev          # http://localhost:5173/<slug>
cd dashboard && npm install && npm run dev      # http://localhost:5174
```

## Pipelines

São dois pipelines no Azure DevOps, cada um apontando para o seu arquivo:
`totem/azure-pipelines.yml` e `dashboard/azure-pipelines.yml`. Os filtros de caminho
fazem cada um rodar só quando a pasta dele muda. As branches são `dev`
(homologação) e `main` (produção).
