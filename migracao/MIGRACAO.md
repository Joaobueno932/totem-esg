# Migração para a infraestrutura corporativa (Azure DevOps · ACR · Kubernetes · Argo CD)

Este documento descreve como o monorepo `totem-esg` foi preparado para virar dois
repositórios corporativos independentes, **backend** e **frontend**, e o que falta
configurar na infraestrutura para publicar. Nada foi criado nem alterado em
serviços remotos. Não houve push, deploy nem mudança de remote.

## 1. Estrutura original

Monorepo com três aplicações e um único `.gitignore`/README na raiz:

| Pasta | Aplicação | Stack | Hospedagem atual |
|---|---|---|---|
| `backend/` | API REST | Node.js + Express 4 + PostgreSQL (`pg`), JWT, zod | Netlify Functions (`serverless-http`) + PostgreSQL no Neon |
| `totem/` | PWA offline-first do participante | React 18 + Vite 5 + Workbox + Dexie | Netlify/Vercel (estático) |
| `dashboard/` | painel administrativo | React 18 + Vite 5 + Tailwind 4 + Recharts | Netlify/Vercel (estático) |
| `docs/` | metodologia, offline, instalação, deploy no Netlify | — | — |
| `docker-compose.yml` | PostgreSQL para desenvolvimento | — | — |

Pontos de partida relevantes:

- Os frontends já não importavam código do backend e falavam com ele só por HTTP. A
  separação física era viável sem refatoração.
- A URL da API era fixada no build (`VITE_API_URL`), com `http://localhost:3001` como
  padrão no código. O totem aceitava também a URL vinda do link (`?api=`) e a guardava
  em cache no dispositivo.
- O backend já tinha `Dockerfile` (Node 20, que saiu de suporte em abril de 2026, e
  processo sem tratamento de sinais), migrations SQL próprias com controle em
  `_migrations` e um teste ponta a ponta (`scripts/e2e-test.mjs`).
- Não havia lint, testes unitários, pipeline de CI nem manifests Kubernetes.
- A única duplicação entre aplicações é a tabela de fatores de emissão
  (`backend/seeds/emission_factors.json` ↔ `totem/src/emissions/factors.json`). Ela é
  intencional: o totem calcula offline e o servidor recalcula com autoridade. As duas
  cópias foram conferidas e estão idênticas (versão `1.0.0-2026.07`, 22 fatores).

## 2. Nova estrutura

O monorepo continua funcionando como antes (inclusive os deploys atuais no Netlify),
e cada pasta de aplicação passou a ser autossuficiente. O script
[`exportar-repositorios.mjs`](exportar-repositorios.mjs) monta os dois repositórios:

```
<destino>/backend/                 ← backend/ do monorepo
  src/ migrations/ seeds/ scripts/ test/ docs/
  Dockerfile  .dockerignore  docker-compose.yml  azure-pipelines.yml
  deploy/k8s/{base,overlays/hml,overlays/prd}
  openapi.yaml  eslint.config.js  .env.example  .gitignore  .gitattributes  README.md

<destino>/frontend/                ← migracao/repositorio-frontend/ + totem/ + dashboard/ + brand/
  README.md  .gitignore  .gitattributes
  totem/      Dockerfile  nginx/  azure-pipelines.yml  deploy/k8s/  docs/  README.md …
  dashboard/  Dockerfile  nginx/  azure-pipelines.yml  deploy/k8s/  README.md …
  brand/
```

```bash
node migracao/exportar-repositorios.mjs              # padrão: ../totem-esg-repositorios
node migracao/exportar-repositorios.mjs <destino>
```

O script copia os arquivos versionados e os novos ainda não commitados. Deixa de fora
tudo o que o `.gitignore` exclui (`.env`, `node_modules`, `dist`, artefatos locais).
Depois roda `git init` em cada destino, sem commit e sem remote, e recusa sobrescrever
uma pasta que não esteja vazia.

**Com histórico (opcional).** A cópia acima começa um histórico novo. Para levar os
commits, com autoria e datas originais, gere o histórico derivado numa cópia
descartável, sem tocar no repositório original. Faça isso depois de commitar estas
mudanças:

```bash
# backend: uma pasta só
git subtree split --prefix=backend -b export/backend

# frontend: várias pastas (requer git-filter-repo), num clone descartável
git clone --no-local . ../frontend-com-historico && cd ../frontend-com-historico
git filter-repo --path totem/ --path dashboard/ --path brand/ \
  --path migracao/repositorio-frontend/ --path-rename migracao/repositorio-frontend/:
```

O monorepo mantém o histórico completo e pode ser arquivado depois da migração.

## 3. Alterações realizadas

### Backend

| Arquivo | Mudança | Motivo |
|---|---|---|
| `src/config.js` | `TRUST_PROXY` configurável (padrão `true`, como antes); `DATABASE_URL` obrigatória em produção; `isServerless` centralizado | rate limit correto atrás de ingress + nginx; não cair em `localhost` em produção |
| `src/rate-limit.js` | cabeçalhos da Netlify/`X-Forwarded-For` só são lidos em serverless; fora dele vale `req.ip` | fora da Netlify, o cliente podia forjar `x-nf-client-connection-ip` e trocar de chave a cada requisição, anulando o rate limit (inclusive o do login) |
| `src/app.js` | `trust proxy` vem da config; nova sonda `GET /api/ready` (consulta o banco com limite de 3 s) | readiness probe separada da liveness (`/api/health`) |
| `src/server.js` | encerramento gracioso em `SIGTERM`/`SIGINT` | rolling update sem derrubar requisições |
| `src/db.js` | usa `isServerless` da config | sem duplicação |
| `src/migrations.js` | erro de migration preserva a causa (`{ cause }`) | apontado pelo lint |
| `scripts/seed.js` | fatores sem combustível não duplicam mais (`NOT EXISTS` com `IS NOT DISTINCT FROM`); seed numa transação com trava consultiva | **bug encontrado na validação**: a `UNIQUE (mode, fuel_type, version)` não barra `NULL`, então cada execução do seed (cada boot do contêiner, cada deploy no Netlify) inseria de novo os 4 fatores de ônibus, avião, bicicleta e outro. O cálculo não era afetado (valores iguais), mas a tabela crescia sem limite. Com réplicas subindo juntas no Kubernetes, isso piora |
| `Dockerfile` | Node 24, multi-stage, só dependências de produção, UID 1000, código somente leitura, `HEALTHCHECK`, `exec` para o Node ser PID 1, imagem base parametrizável | imagem mantida, sinais corretos, espelho no ACR |
| `.dockerignore`, `.gitignore`, `.gitattributes` | novos/ampliados | contexto mínimo, sem `.env` na imagem nem no Git, LF nos arquivos de contêiner |
| `.env.example` | documenta todas as variáveis e quais são segredos | — |
| `docker-compose.yml` | movido da raiz; ganhou o serviço da API e healthcheck do PostgreSQL | dependência de desenvolvimento do backend |
| `package.json` | scripts `lint` e `test`, `engines`, ESLint 10 (dev) | etapas do pipeline |
| `test/*.test.js` | 19 testes unitários com `node:test` | cobrir as mudanças e o motor de cálculo sem banco |
| `openapi.yaml` | contrato de todas as rotas | interface versionada entre os repositórios |
| `azure-pipelines.yml`, `deploy/k8s/**` | novos | CI/CD e GitOps |
| `docs/*.md` | metodologia, cálculo, referências e limitações movidos de `docs/` e links corrigidos | documentação acompanha o repositório que é a fonte da verdade dos fatores |

### Totem

| Arquivo | Mudança | Motivo |
|---|---|---|
| `src/config.js` | sem configuração, a API passa a ser a **mesma origem** (antes: `http://localhost:3001`); `VITE_ALLOW_API_OVERRIDE=false` desliga o `?api=` e o cache | sem localhost em produção; impedir que um link adulterado desvie respostas com dados pessoais para outro servidor e "envenene" o cache de um quiosque |
| `src/sync.js` | removida a checagem `if (!apiUrl)`, que impediria a sincronização na mesma origem | consequência da mudança acima |
| `vite.config.js` | proxy `/api` em dev/preview; `navigateFallbackDenylist` para `/api/` no service worker | mesma origem também em dev; navegação para a API não vira `index.html` |
| `Dockerfile`, `nginx/*` | novos: build + nginx sem root, proxy reverso só para `/api/public`, `/api/sync`, `/api/health`; cache correto do PWA; validação de `BACKEND_URL` | imagem própria; API interna ao cluster; rotas administrativas fora do domínio público |
| `eslint.config.js`, `src/**/*.test.js`, `package.json` | ESLint 10, Vitest 3, 13 testes | etapas do pipeline |
| `.env.example`, `.dockerignore`, `azure-pipelines.yml`, `deploy/k8s/**`, `README.md` | novos/atualizados | — |
| `docs/offline.md` | movido de `docs/` | — |

### Dashboard

| Arquivo | Mudança | Motivo |
|---|---|---|
| `src/api.js` | API na mesma origem por padrão (antes: localhost); URL do totem lida em execução (`window.__APP_CONFIG__`) antes do build; `?api=` só entra no link quando a API tem endereço absoluto público | sem localhost; mesma imagem para hml e prd |
| `index.html`, `public/config.js` | carrega `/config.js` antes do app (vazio fora do contêiner) | configuração de execução |
| `vite.config.js` | proxy `/api` em dev/preview | — |
| `Dockerfile`, `nginx/*` | novos: nginx sem root, proxy `/api/*` (corpo até 4 MB), `/config.js` gerado do ambiente, cabeçalhos de segurança, validação de `BACKEND_URL` e `TOTEM_PUBLIC_URL` | — |
| `eslint.config.js`, `src/api.test.js`, `package.json` | ESLint 10, Vitest 3, 7 testes | — |
| `.env.example`, `.dockerignore`, `azure-pipelines.yml`, `deploy/k8s/**`, `README.md` | novos/atualizados | — |

### Monorepo

- `README.md` atualizado: nova estrutura e links. A instrução `?config=1`, de uma tela
  que não existe mais, foi retirada.
- `.gitattributes` novo, que garante LF nos scripts e templates executados nos contêineres.
- `docs/instalacao.md` removido, porque estava desatualizado e foi substituído pelos
  READMEs de cada aplicação. `docs/deploy-producao.md` (Netlify) e o PDF continuam
  como referência do ambiente atual.
- `.claude/settings.json` removido. Era configuração local de assistente de código,
  nunca versionada e sem relação com o produto. Nenhum outro artefato de ferramenta
  de IA foi encontrado no projeto nem no histórico. O `.gitignore` de cada repositório
  novo já ignora esses diretórios.

**Comportamento preservado.** Regras de negócio, rotas, contratos, validações,
migrations, schema, cálculo, autenticação e telas continuam iguais. As mudanças de
comportamento são estas: a API em `localhost` deixa de ser o padrão; o totem da
imagem Docker ignora `?api=` e o cache; e o rate limit, fora da Netlify, deixa de
confiar em cabeçalhos enviados pelo cliente. Netlify e Vercel continuam funcionando
como antes: lá o `?api=` segue ativo e os cabeçalhos da plataforma seguem valendo.

## 4. Dependências entre aplicações

| De → para | Como | Contrato |
|---|---|---|
| totem → backend | HTTP na mesma origem, via nginx do totem | `GET /api/public/events/{slug}`, `POST /api/sync/answers` |
| dashboard → backend | HTTP na mesma origem, via nginx do dashboard, `Authorization: Bearer` | `/api/admin/*` |
| dashboard → totem | só a URL pública do totem, para montar links/QR | `TOTEM_PUBLIC_URL` + `/<slug>` |
| totem ↔ backend (dados) | cópia dos fatores de emissão | mesma `version` nos dois; o servidor recalcula |
| backend → PostgreSQL | `DATABASE_URL` (TLS) | migrations do próprio backend |
| navegador → viacep.com.br | consulta de CEP no cadastro de evento | API pública, sem credenciais |

Nenhuma aplicação depende de arquivos de outra para compilar, testar ou gerar imagem.
Isso foi verificado com cópias isoladas (seção 11).

## 5. Azure DevOps

1. Criar dois repositórios, por exemplo `totem-esg-backend` e `totem-esg-frontend`, e
   publicar o conteúdo exportado na `main`. Depois criar a branch `dev` a partir dela.
2. Criar os pipelines a partir dos YAMLs existentes:
   - backend: `azure-pipelines.yml`;
   - frontend: `totem/azure-pipelines.yml` e `dashboard/azure-pipelines.yml`, ou seja,
     **dois** pipelines no mesmo repositório, cada um com filtro de caminho.
3. Criar a service connection **Docker Registry → Azure Container Registry**
   (preferencialmente com Workload Identity Federation) e colocar o nome dela em
   `acrServiceConnection` nos três YAMLs. Ela precisa de `AcrPush`.
4. Pool de agentes: os YAMLs usam `ubuntu-latest` (hospedado pela Microsoft). Em pool
   próprio, use agentes Linux com Docker. O job ponta a ponta do backend usa o
   PostgreSQL como *service container*.
5. Políticas de branch em `dev` e `main`: PR obrigatório e o pipeline como validação
   de build. Em PR, as imagens só são construídas, nunca publicadas.
6. Se a rede dos agentes não alcança o Docker Hub, aponte as imagens base para o
   espelho no ACR. Nos `Dockerfile`s, use `--build-arg NODE_IMAGE=…`/`NGINX_IMAGE=…`
   pelo input `arguments` com `command: build` seguido de `push`. No backend, troque
   também `resources.containers.postgres.image`.

## 6. ACR

- Repositórios de imagem: `totem-esg-backend`, `totem-esg-totem`, `totem-esg-dashboard`.
- Tags geradas por build: `<versão do package.json>-<branch>.<BuildId>` e `sha-<commit>`.
  São únicas, e por isso podem ficar bloqueadas para escrita (tag locking) se for o padrão.
- Permissões: `AcrPush` para a identidade do pipeline e `AcrPull` para o cluster
  (`az aks update --attach-acr` ou a identidade do kubelet).
- Espelho/cache das imagens base, se necessário: `node:24-alpine`,
  `nginxinc/nginx-unprivileged:1.30-alpine` e `postgres:16-alpine` (só CI).
- Recomendado: política de retenção para manifests sem tag e varredura de
  vulnerabilidades (Defender for Containers ou o padrão da empresa).

## 7. Kubernetes e Argo CD

Os manifests em `deploy/k8s/` são **de referência**, em Kustomize, com base e
overlays `hml`/`prd`. Se a empresa usa Helm ou um repositório GitOps central, leve
para lá os requisitos abaixo em vez de duplicar arquivos.

**Por namespace (hml e prd):**

- Secret `totem-esg-backend-secrets` com `DATABASE_URL` e `JWT_SECRET`. Gere um
  `JWT_SECRET` novo por ambiente. `ADMIN_EMAIL` e `ADMIN_PASSWORD` só entram para
  criar o primeiro acesso e devem sair depois. Provisione o Secret pelo mecanismo
  corporativo (Key Vault + External Secrets/CSI), nunca em Git.
- Valores dos overlays (`__PREENCHER_*__`): namespace, `<acr>.azurecr.io`, tag da
  imagem, `CORS_ORIGINS` (URL do dashboard) e `TOTEM_PUBLIC_URL` (URL do totem).
- `TRUST_PROXY`: a base usa `2` (ingress → nginx do frontend → API). Ajuste se houver
  outro salto, como um Application Gateway à frente do ingress. Para conferir em hml,
  duas máquinas diferentes chamando `GET /api/public/events/<slug>` devem ver
  contadores `RateLimit-Remaining` independentes.

**Exposição (ingress/gateway, fora destes manifests):**

| Service | Exposição | Observações |
|---|---|---|
| `totem-esg-totem` | pública, HTTPS | obrigatório para o PWA; timeout ≥ 60 s |
| `totem-esg-dashboard` | HTTPS; de preferência só rede interna/VPN | `proxy-body-size` ≥ 4 MB (imagem do evento) |
| `totem-esg-backend` | **nenhuma** (ClusterIP) | acessada só pelos nginx dos frontends |

**Recomendado:** NetworkPolicy permitindo tráfego para a API só a partir dos pods do
totem e do dashboard. Liberar a saída da API para o PostgreSQL (firewall ou private
endpoint do banco gerenciado).

**Argo CD:** um `Application` por aplicação e ambiente, apontando para o overlay.
Exemplo, com valores a preencher:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: totem-esg-backend-hml
  namespace: argocd
spec:
  project: __PREENCHER_PROJETO_ARGOCD__
  source:
    repoURL: __PREENCHER_URL_REPOSITORIO__
    targetRevision: dev
    path: deploy/k8s/overlays/hml
  destination:
    server: https://kubernetes.default.svc
    namespace: __PREENCHER_NAMESPACE_HML__
  syncPolicy:
    automated: { prune: true, selfHeal: true }
```

Os pipelines publicam a imagem, mas **não** atualizam a tag nos overlays. Essa etapa
depende do padrão corporativo: Argo CD Image Updater, PR automático no repositório de
manifests ou outro mecanismo.

## 8. Ordem de implantação

1. **Banco**: provisionar o PostgreSQL gerenciado (16, ou 14+) e o Secret do backend.
2. **Dados** (se houver migração do ambiente atual): ver "Migração dos dados" abaixo,
   antes de o backend subir pela primeira vez.
3. **Backend**: na inicialização, aplica as migrations pendentes e o seed (os dois
   são idempotentes). Aguarde `/api/ready` responder 200.
4. **Totem e dashboard**: em qualquer ordem, depois do Service da API existir, porque
   o nginx resolve `BACKEND_URL` ao iniciar.
5. **Ingress/DNS/TLS** dos dois frontends.
6. **Testes de fumaça**: login no dashboard, criação de evento de teste, abertura do
   link no totem, uma resposta, conferência em Respostas/Sincronização e exclusão
   da resposta de teste.

### Migração dos dados (Neon → banco corporativo)

1. Combine uma janela **sem eventos em andamento**. Confirme que todo totem em uso
   mostra **0 "aguardando envio"**: a fila offline de cada dispositivo só sincroniza
   com a API para a qual o link dele aponta.
2. `pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL_NEON" > totem-esg.dump`
3. `pg_restore --no-owner --no-acl -d "$DATABASE_URL_CORPORATIVO" totem-esg.dump`. A
   tabela `_migrations` vem junto, então nenhuma migration é reaplicada. Usuários do
   painel mantêm as senhas (hash bcrypt).
4. Confira as contagens (`events`, `participants`, `transport_answers`, `admin_users`)
   nos dois bancos.
5. **Duplicatas de fatores criadas pelo seed antigo**: o banco atual provavelmente tem
   linhas repetidas em `emission_factors` (ver seção 3). Elas não afetam o cálculo, mas
   aparecem repetidas no painel e em `GET /api/sync/factors`. Nenhuma tabela referencia
   `emission_factors`, então dá para remover as cópias com segurança. Isso **apaga
   dados**, então só rode com aprovação e depois de um backup, no banco de destino:

   ```sql
   -- conferir antes: quantas cópias existem
   SELECT mode, fuel_type, version, count(*) FROM emission_factors
    GROUP BY 1, 2, 3 HAVING count(*) > 1;

   -- remover as cópias, mantendo a linha mais antiga de cada fator
   DELETE FROM emission_factors a
    USING emission_factors b
    WHERE a.id > b.id
      AND a.mode = b.mode
      AND a.fuel_type IS NOT DISTINCT FROM b.fuel_type
      AND a.version = b.version;
   ```
6. Gere os QR codes de novo pelo dashboard corporativo. O slug de cada evento é
   preservado, então só a base da URL muda. Para os QR codes já impressos, configure
   no site antigo do totem um redirecionamento `/* → https://<totem-corporativo>/:splat`.
7. Depois de estabilizar, desative os sites do Netlify, o banco no Neon e as
   credenciais dele.

## 9. Rollback

- **Aplicação**: as tags de imagem são imutáveis. Para voltar, reverta no repositório
  GitOps o commit que trocou a tag (`git revert`) e o Argo CD sincroniza a versão
  anterior. Com auto-sync desligado, use o histórico do próprio Argo CD. As
  probes e o `maxUnavailable: 0` impedem que uma versão que não fica pronta substitua
  a anterior.
- **Banco**: as migrations só avançam (não há "down") e as atuais só acrescentam.
  Antes de publicar uma versão com migration nova, garanta um ponto de restauração
  (backup/PITR do banco gerenciado). Se uma migration der errado, corrija com outra
  migration ou restaure o ponto.
- **Corte de ambiente**: até desativar o Netlify, voltar é reapontar DNS/links para
  ele. As respostas coletadas no ambiente novo durante a janela teriam de ser
  exportadas e importadas de volta, então mantenha a janela curta.

## 10. Checklist de publicação

- [ ] Revisar e commitar esta branch; exportar os repositórios (`exportar-repositorios.mjs`).
- [ ] Criar os repositórios no Azure DevOps, publicar `main` e criar `dev`.
- [ ] Preencher os `__PREENCHER_*__` dos pipelines e dos overlays.
- [ ] Service connection do ACR, pool de agentes e políticas de branch.
- [ ] Espelho das imagens base no ACR, se o Docker Hub for bloqueado.
- [ ] Namespaces hml/prd, Secret do backend, `AcrPull` no cluster.
- [ ] Ingress/gateway com TLS para totem e dashboard, sem expor o backend.
- [ ] `TRUST_PROXY` conferido em hml.
- [ ] `Application`s no Argo CD e mecanismo de atualização da tag.
- [ ] Pipeline verde em `dev`, implantação em hml e testes de fumaça.
- [ ] Migração dos dados (se houver) e reimpressão/redirecionamento dos QR codes.
- [ ] Promover para `main`/prd e repetir os testes de fumaça.
- [ ] Remover `ADMIN_PASSWORD` do Secret após o primeiro acesso.
- [ ] Desativar Netlify/Neon e remover os arquivos legados (`netlify.toml`,
      `netlify/`, `public/` do backend, `vercel.json`, dependência `serverless-http`).
- [ ] Construir as imagens dos frontends com a base `nginx-unprivileged` real e repetir
      os testes do compose de integração (ver seção 11).

## 11. Validação executada (26/11/2026)

Feita numa máquina Windows com Node 24.19 e Docker 29.7. Todos os testes usaram bancos
e credenciais descartáveis. Nenhum serviço real foi acionado e o banco atual não foi
tocado.

| Verificação | Backend | Totem | Dashboard |
|---|---|---|---|
| `npm ci` a partir da cópia exportada, fora do monorepo | ✅ | ✅ | ✅ |
| Lint (ESLint 10) | ✅ 0 erros, 1 aviso pré-existente | ✅ | ✅ 0 erros, 1 aviso pré-existente |
| Typecheck | não se aplica (JavaScript, sem TypeScript) | idem | idem |
| Testes unitários | ✅ 19 | ✅ 13 | ✅ 7 |
| Build de produção | não se aplica (sem etapa de build) | ✅ (gera service worker) | ✅ |
| Imagem Docker | ✅ base real `node:24-alpine` | ⚠️ ver abaixo | ⚠️ ver abaixo |
| Teste ponta a ponta existente (35 verificações) | ✅ direto no contêiner e ✅ pelo proxy do dashboard | — | ✅ (via proxy) |

**Integração** (`docker-compose.integracao.yml`: API sem porta publicada, contêineres
sem root, sistema de arquivos somente leitura):

- API: 6 migrations e seed na primeira subida; reinícios sem reaplicar nada; seed
  com 22 fatores após 3 boots e com 3 execuções simultâneas sobre a tabela vazia;
  `SIGTERM` encerra em ~2 s com código 0; Node como PID 1 com UID 1000; `/api/ready` ok.
- Totem: `/api/public`, `/api/sync` e `/api/health` passam pelo proxy; `/api/admin/*` e
  `/api/ready` dão 404; sincronização pelo proxy com recálculo no servidor; cache
  imutável em `/assets/*` e `no-cache` em `index.html`/`sw.js`; o bundle da imagem não
  contém `localhost` nem o código do `?api=`.
- Dashboard: `/config.js` gerado do ambiente; `X-Frame-Options`, `nosniff` e
  `Referrer-Policy`; criação de evento com corpo de 1,9 MB (imagem) pelo proxy.
- Navegador real (Chrome headless): login no dashboard e listagem com todas as chamadas
  na mesma origem; totem aberto com `?api=https://atacante.example` só falou com a
  própria origem e não gravou nada em cache; service worker ativo; nenhum erro de JS.
- Falhas de configuração derrubam o contêiner com mensagem clara: `BACKEND_URL` ausente,
  sem esquema ou com caminho; `TOTEM_PUBLIC_URL` ausente ou com aspas;
  `/etc/nginx/conf.d` sem permissão de escrita.
- Manifests: os 6 overlays renderizam com `kubectl kustomize` (ConfigMap com hash,
  imagem e namespace substituídos). Pipelines e composes têm YAML válido. O
  `openapi.yaml` é válido, os 140 `$ref` resolvem e as 23 rotas batem exatamente com
  o código.
- Independência: nenhum import ou caminho entre repositórios, nenhum caminho absoluto
  da máquina, nenhum padrão de segredo nos arquivos exportados e `git diff --check`
  limpo.

**Não validado:**

- ⚠️ **Base `nginxinc/nginx-unprivileged:1.30-alpine`**: a rede desta máquina cortou
  repetidamente o download da imagem (`tls: bad record MAC` / `unexpected EOF`, também
  fora do Docker). As imagens dos frontends foram construídas e testadas com o
  `nginx:1.30.6-alpine` oficial (mesma versão do nginx e mesmos scripts de entrypoint),
  rodando como UID 101 e somente leitura. Com a base oficial foi preciso deixar `/run`
  e `/var/cache/nginx` graváveis, algo que a base sem privilégios dispensa, porque usa
  `/tmp`. Repita o build e o compose de integração com a base real antes de publicar:
  `docker compose -f migracao/docker-compose.integracao.yml up -d --build`.
- Pipelines no Azure DevOps, push no ACR, Argo CD e cluster: dependem da infraestrutura
  corporativa e dos valores `__PREENCHER_*__`.
- Fluxo completo de preenchimento no totem pelo navegador: a gravação foi validada
  pela API (proxy do totem), e as telas não foram alteradas.
