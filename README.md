# Pegada de Carbono — Totem de eventos

Sistema para totens de eventos que calcula a **emissão estimada de CO₂e gerada
exclusivamente pelo transporte dos participantes**, dentro de uma proposta de
evento Carbono Zero.

> Este monorepo está preparado para ser dividido em dois repositórios corporativos
> (**backend** e **frontend**) com pipelines no Azure DevOps, imagens no ACR e
> implantação via Kubernetes/Argo CD. Veja [`migracao/MIGRACAO.md`](migracao/MIGRACAO.md).

## Componentes

| Pasta | O que é | Stack | Repositório de destino |
|---|---|---|---|
| [`backend/`](backend/README.md) | API REST: sincronização, autenticação, indicadores, exportação | Node.js + Express + PostgreSQL | backend |
| [`totem/`](totem/README.md) | App/PWA do participante, **offline-first**, modo quiosque | React + Vite + Dexie (IndexedDB) + Service Worker | frontend |
| [`dashboard/`](dashboard/README.md) | Site administrativo (login obrigatório): leads, indicadores, relatórios, exportação | React + Vite + Tailwind + Recharts + SheetJS | frontend |
| `brand/` | Arte original da marca | — | frontend |
| `migracao/` | Documento de migração, script de exportação e arquivos da raiz do repositório frontend | — | — |
| `docs/` | Referência do ambiente atual (deploy no Netlify) | — | — |

Cada aplicação tem dependências, testes, `Dockerfile`, pipeline e manifests
Kubernetes próprios, e nenhuma depende de arquivos das outras.

## Como funciona (resumo)

1. A equipe cadastra o evento no **dashboard**, que gera o link/QR do totem para o
   evento (`https://<totem>/<slug-do-evento>`).
2. O participante responde no totem: dados pessoais (com aceite LGPD) e
   deslocamento — um ou mais trechos (até 6), cada um com modal, combustível,
   distância, ida/volta e ocupantes.
3. O **cálculo é 100% local** (fatores de emissão versionados embarcados no
   app) — funciona sem internet. O participante vê **apenas a própria emissão
   individual** em kg CO₂e e toca em "Finalizar", que limpa a sessão.
4. Cada resposta recebe um **UUID local** e entra numa **fila em IndexedDB**.
   Quando há internet, a fila sincroniza automaticamente com a API, que
   **recalcula com os fatores versionados** e descarta duplicados pelo UUID.
5. No dashboard a equipe vê leads, emissão total/média, distribuição por modal,
   cidades, empresas, ranking, árvores estimadas para neutralização e imprime o
   relatório consolidado (PDF via impressão do navegador).

## Início rápido (desenvolvimento)

Pré-requisitos: Node.js 22+ e Docker (ou um PostgreSQL local).

```bash
# 1. Banco de dados + API
cd backend
cp .env.example .env
docker compose up -d postgres
npm install
npm run migrate
npm run seed                                   # fatores de emissão versionados
npm run create-admin admin@evento.com "SenhaForte123" "Admin"
npm run dev                                    # http://localhost:3001

# 2. Totem (novo terminal)
cd totem
npm install
npm run dev                                    # http://localhost:5173/<slug>

# 3. Dashboard (novo terminal)
cd dashboard
npm install
npm run dev                                    # http://localhost:5174
```

Em desenvolvimento os frontends chamam `/api` na própria origem e o Vite encaminha
para a API em `localhost:3001`. Depois: entre no dashboard, crie um evento em
**Eventos** e abra o link do totem gerado para ele.

> Para testar o PWA/offline de verdade use `npm run build && npm run preview`
> no totem — o Service Worker só é gerado no build de produção.

## Documentação

- [`migracao/MIGRACAO.md`](migracao/MIGRACAO.md) — preparação para Azure DevOps/ACR/Kubernetes/Argo CD
- [`backend/docs/metodologia.md`](backend/docs/metodologia.md) — metodologia de cálculo e fontes dos fatores
- [`backend/docs/calculo-por-tipo.md`](backend/docs/calculo-por-tipo.md) e [`backend/docs/referencias-e-calculos.md`](backend/docs/referencias-e-calculos.md) — cálculos detalhados
- [`backend/docs/limitacoes.md`](backend/docs/limitacoes.md) — limitações das estimativas
- [`totem/docs/offline.md`](totem/docs/offline.md) — como o modo offline funciona
- [`backend/openapi.yaml`](backend/openapi.yaml) — contrato da API
- [`docs/deploy-producao.md`](docs/deploy-producao.md) — deploy atual (Netlify + Neon)

## Segurança e LGPD (resumo)

- Consentimento LGPD **obrigatório** separado do consentimento de marketing **opcional**.
- Tela final do participante mostra só a emissão individual; "Finalizar" limpa a sessão.
- Dashboard com login (JWT, senha com bcrypt), rotas administrativas protegidas.
- Rate limit nas rotas públicas; validação de entrada com Zod; deduplicação por UUID.
- Nenhuma chave/API key no frontend; exportação de dados só no dashboard autenticado.
- Fila local do totem apaga respostas sincronizadas após 7 dias (minimização de dados).
- Nas imagens Docker, a API fica interna ao cluster: cada frontend a acessa por proxy
  na própria origem, e o totem público só encaminha as rotas públicas.
