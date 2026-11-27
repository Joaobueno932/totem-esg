# Pegada de Carbono — Backend (API)

API REST do sistema Pegada de Carbono, que estima a emissão de CO₂e do deslocamento
dos participantes de eventos. Concentra as regras de negócio e o acesso ao banco:

- **sincronização** das respostas coletadas offline pelo totem, com recálculo no
  servidor pelos fatores de emissão versionados e deduplicação por UUID;
- **autenticação** do painel (JWT) e autorização por papel (`admin`, `organizador`,
  `viewer`);
- **eventos, leads, respostas, indicadores, relatórios e exportação CSV** para o
  dashboard.

Os dois clientes ficam no repositório **frontend**: `totem/` (PWA do participante) e
`dashboard/` (painel administrativo). O contrato entre eles e esta API está em
[`openapi.yaml`](openapi.yaml).

## Stack

| Item | Versão |
|---|---|
| Node.js | 24 LTS (mínimo 22) — imagem `node:24-alpine` |
| Express | 4.22 |
| PostgreSQL | 16 (local/CI); compatível com 14+ |
| Driver `pg` | 8.22 |
| Validação | zod 3 · JWT `jsonwebtoken` 9 · senhas `bcryptjs` · `express-rate-limit` 7 |
| Qualidade | ESLint 10 · testes com `node:test` (embutido no Node) |

## Estrutura

```
src/
  server.js          entrada do processo (porta, encerramento gracioso)
  app.js             Express: rotas, CORS, rate limit, sondas
  config.js          variáveis de ambiente
  db.js              pool do PostgreSQL
  migrations.js      aplica migrations/*.sql (também no boot da API)
  routes/            sync (totem), public (totem), auth e admin (dashboard)
  services/          motor de cálculo de emissões
migrations/          SQL versionado (001_… a 006_…), registrado na tabela _migrations
seeds/               fatores de emissão versionados (fonte da verdade)
scripts/             migrate, seed, create-admin, teste ponta a ponta
test/                testes unitários (node --test)
docs/                metodologia de cálculo, referências e limitações
deploy/k8s/          manifests Kubernetes de referência (Kustomize)
netlify/, public/    legado: deploy serverless no Netlify (ver "Legado")
```

## Variáveis de ambiente

Modelo em [`.env.example`](.env.example). Em contêiner, as não sensíveis vêm de um
ConfigMap e as sensíveis de um Secret gerenciado pela plataforma.

| Variável | Obrigatória | Sensível | Padrão | Uso |
|---|---|---|---|---|
| `DATABASE_URL` | sim em produção | **sim** | `postgres://postgres:postgres@localhost:5432/carbono_zero` (só dev) | conexão PostgreSQL; com `sslmode=require` o certificado do servidor é validado |
| `JWT_SECRET` | sim em produção | **sim** | valor inseguro de dev (recusado com `NODE_ENV=production`) | assinatura dos tokens do painel |
| `NODE_ENV` | — | não | `production` na imagem | ativa as verificações acima |
| `PORT` | não | não | `3001` | porta HTTP |
| `JWT_EXPIRES_IN` | não | não | `8h` | validade do token |
| `CORS_ORIGINS` | não | não | `*` | origens aceitas nas rotas `/api/admin` (vírgula) |
| `SYNC_RATE_LIMIT` | não | não | `300` | requisições por IP a cada 15 min em `/api/sync` e `/api/public` |
| `TRUST_PROXY` | não | não | `true` | proxies confiáveis para obter o IP do cliente (`true`, `false`, nº de saltos ou sub-redes) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | não | senha **sim** | — | cria/atualiza o admin na inicialização; remova a senha após o primeiro acesso |
| `MIGRATIONS_DIR` | não | não | `./migrations` | outro diretório de migrations |

`TRUST_PROXY` define a chave do rate limit. Com `true`, o IP vem do primeiro valor de
`X-Forwarded-For`, que o próprio cliente pode forjar. Atrás de proxies conhecidos,
use o número de saltos: no desenho de referência (ingress → nginx do frontend → API)
o valor é `2`. Um número maior que o real reabre a falsificação. Um número menor faz
todos os clientes contarem como um só IP, e o limite de sincronização trava os totens.

## Desenvolvimento local

Pré-requisitos: Node.js 22+ e Docker (ou um PostgreSQL acessível).

```bash
cp .env.example .env
docker compose up -d postgres          # PostgreSQL em localhost:5432
npm install
npm run migrate                        # cria/atualiza as tabelas (idempotente)
npm run seed                           # fatores de emissão versionados (idempotente)
npm run create-admin admin@evento.com "SenhaForte123" "Admin"
npm run dev                            # http://localhost:3001 (recarrega ao salvar)
```

Ou tudo em contêiner: `docker compose up -d --build` (API em `http://localhost:3001`).
Para criar o admin assim, exporte `ADMIN_EMAIL` e `ADMIN_PASSWORD` antes.

## Testes

```bash
npm run lint
npm test               # unitários: cálculo, slug, config, rate limit, sondas (sem banco)
npm run test:e2e       # ponta a ponta contra uma API rodando com banco migrado e seedado
```

O `test:e2e` usa `API_URL` (padrão `http://localhost:3001`) e o admin
`admin@evento.com` / `SenhaForte123` criado com `create-admin`. Ele **grava dados**
(cria um evento "Evento Teste E2E" a cada execução): rode só em banco descartável,
nunca em produção.

## Docker

```bash
docker build -t totem-esg-backend .
docker run -p 3001:3001 -e DATABASE_URL=... -e JWT_SECRET=... totem-esg-backend
```

- Multi-stage, só dependências de produção, usuário sem privilégios (UID 1000),
  código somente leitura. Compatível com `readOnlyRootFilesystem` (monte `/tmp`).
- Na inicialização: `migrate` → `seed` → `create-admin:env` (se houver variáveis) →
  API. O `exec` deixa o Node como PID 1. No `SIGTERM` ele para de aceitar conexões,
  conclui as requisições em andamento e fecha o pool.
- Sondas: `GET /api/health` (vivacidade, não toca o banco) e `GET /api/ready`
  (prontidão, `SELECT 1` com limite de 3 s; 503 sem banco).
- Logs em stdout/stderr.
- Imagem base de espelho interno: `--build-arg NODE_IMAGE=<acr>.azurecr.io/node:24-alpine`.

## Banco de dados

PostgreSQL com migrations SQL próprias (sem ORM). `src/migrations.js` aplica, em
ordem, os arquivos de `migrations/` ainda não registrados na tabela `_migrations`.
Cada arquivo roda numa transação, sob `pg_advisory_lock`, e por isso várias réplicas
podem subir ao mesmo tempo. A API também aplica as pendentes no primeiro acesso.
Para mudar o schema, crie `007_<descricao>.sql`. Não edite migrations já aplicadas.

O seed (`seeds/emission_factors.json`) insere a versão atual dos fatores e desativa as
anteriores, numa transação com trava consultiva. Pode rodar a cada boot e em várias
réplicas ao mesmo tempo sem duplicar linhas. O totem embarca uma cópia desses fatores para calcular offline. Ao mudar
os fatores, publique a nova versão nos dois repositórios (o servidor recalcula toda
resposta e o valor dele prevalece). Metodologia em [`docs/metodologia.md`](docs/metodologia.md).

Só esta API acessa o banco. Os frontends não têm credenciais nem conexão com ele.

## Integração com os frontends

- Os navegadores não chamam esta API diretamente. Cada frontend serve `/api/*` na
  **própria origem**, e o nginx da imagem dele encaminha para `BACKEND_URL` (o Service
  interno desta API). Por isso o Service é `ClusterIP` e não precisa de exposição
  pública, e o CORS não entra em jogo.
- O nginx do **totem** (público) encaminha só `/api/public/*`, `/api/sync/*` e
  `/api/health`. As rotas administrativas passam apenas pelo **dashboard**.
- O token do painel vai no cabeçalho `Authorization: Bearer`. Não há cookies nem
  sessão no servidor, então CSRF não se aplica.
- O tamanho máximo do corpo é 3 MB (imagem do evento). O proxy do dashboard aceita 4 MB
  e o ingress precisa aceitar o mesmo.

## Implantação (Azure DevOps → ACR → Argo CD)

**Pipeline** ([`azure-pipelines.yml`](azure-pipelines.yml)): roda em `dev`, `main` e
PRs para elas. Faz lint, testes unitários e testes ponta a ponta (PostgreSQL como
service container), depois o build da imagem. Em PR a imagem é só construída. Em
`dev`/`main` ela vai para o ACR com as tags `<versão>-<branch>.<BuildId>` e
`sha-<commit>`.

**Kubernetes** ([`deploy/k8s`](deploy/k8s)): base + overlays `hml` (branch `dev`) e
`prd` (branch `main`). Inclui Deployment com probes, recursos, `RollingUpdate` sem
indisponibilidade, contexto sem root, Service ClusterIP e ConfigMap. Valide com
`kubectl kustomize deploy/k8s/overlays/hml`. São manifests de **referência**: se a
empresa usa Helm ou outro layout de GitOps, use-os como especificação.

O Secret `totem-esg-backend-secrets` precisa existir no namespace com as chaves
`DATABASE_URL` e `JWT_SECRET`, e opcionalmente `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

### Pendências de infraestrutura

Os valores `__PREENCHER_*__` no pipeline e nos overlays dependem da equipe de
infraestrutura:

- service connection do ACR no Azure DevOps (`acrServiceConnection`) e o pool de agentes;
- nome do ACR, namespaces de homologação e produção;
- provisionamento do Secret (Key Vault + External Secrets/CSI ou equivalente);
- PostgreSQL gerenciado (ex.: Azure Database for PostgreSQL), com `sslmode=require`;
- forma de atualizar a tag da imagem no repositório GitOps (Image Updater, PR automático…);
- espelho das imagens base (`node`, `postgres` do CI) se o Docker Hub for bloqueado;
- número real de proxies à frente da API (`TRUST_PROXY`).

## Legado: Netlify

`netlify.toml`, `netlify/functions/api.js`, `public/` e o script `netlify:build` servem
ao deploy serverless atual no Netlify e não são usados no Azure. Remova-os (junto com a
dependência `serverless-http`) depois que o Netlify for desativado.
