# Carbono Zero — Totem de eventos

Sistema para totens de eventos que calcula a **emissão estimada de CO₂e gerada
exclusivamente pelo transporte dos participantes**, dentro de uma proposta de
evento Carbono Zero.

## Componentes

| Pasta | O que é | Stack |
|---|---|---|
| `totem/` | App/PWA do participante, **offline-first**, modo quiosque | React + Vite + Dexie (IndexedDB) + Service Worker |
| `dashboard/` | Site administrativo (login obrigatório): leads, indicadores, relatórios, exportação | React + Vite + Tailwind + Recharts + SheetJS |
| `backend/` | API REST: sincronização, autenticação, indicadores, exportação | Node.js + Express + PostgreSQL |
| `docs/` | Documentação de instalação, offline, metodologia e limitações | — |

## Como funciona (resumo)

1. A equipe cadastra o evento no **dashboard** e configura o **totem** com o ID
   do evento e a URL da API (7 toques no canto superior esquerdo da tela
   inicial ou abrindo o app com `?config=1`).
2. O participante responde no totem: dados pessoais (com aceite LGPD) e
   deslocamento (modal, combustível, distância, ida/volta, ocupantes).
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

Pré-requisitos: Node.js 20+, Docker (ou um PostgreSQL local).

```bash
# 1. Banco de dados
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run migrate
npm run seed                                   # fatores de emissão versionados
npm run create-admin admin@evento.com "SenhaForte123" "Admin"
npm run dev                                    # http://localhost:3001

# 3. Totem (novo terminal)
cd totem
npm install
npm run dev                                    # http://localhost:5173

# 4. Dashboard (novo terminal)
cd dashboard
npm install
npm run dev                                    # http://localhost:5174
```

Depois: entre no dashboard, crie um evento em **Eventos**, anote o ID e
configure o totem (`http://localhost:5173/?config=1`).

> Para testar o PWA/offline de verdade use `npm run build && npm run preview`
> no totem — o Service Worker só é gerado no build de produção.

## Documentação

- [`docs/instalacao.md`](docs/instalacao.md) — instalação local e produção
- [`docs/offline.md`](docs/offline.md) — como o modo offline funciona
- [`docs/metodologia.md`](docs/metodologia.md) — metodologia de cálculo e fontes dos fatores
- [`docs/limitacoes.md`](docs/limitacoes.md) — limitações das estimativas

## Segurança e LGPD (resumo)

- Consentimento LGPD **obrigatório** separado do consentimento de marketing **opcional**.
- Tela final do participante mostra só a emissão individual; "Finalizar" limpa a sessão.
- Dashboard com login (JWT, senha com bcrypt), rotas administrativas protegidas.
- Rate limit nas rotas públicas; validação de entrada com Zod; deduplicação por UUID.
- Nenhuma chave/API key no frontend; exportação de dados só no dashboard autenticado.
- Fila local do totem apaga respostas sincronizadas após 7 dias (minimização de dados).
