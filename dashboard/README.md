# Pegada de Carbono — Dashboard (painel administrativo)

Site administrativo, com login obrigatório, para a equipe dos eventos. Permite
cadastrar eventos (e gerar o link/QR do totem), ver leads e respostas, acompanhar
indicadores (emissão total e média, modais, cidades, empresas, ranking, árvores para
neutralização), gerar o relatório consolidado (PDF pela impressão do navegador),
exportar dados (CSV e XLSX), acompanhar a sincronização dos totens e gerenciar
usuários e papéis.

## Stack

| Item | Versão |
|---|---|
| React | 18.3 · React Router 6.30 |
| Vite | 5.4 · Tailwind CSS 4 |
| Gráficos e exportação | Recharts 2 · SheetJS (`xlsx`) 0.18 · `qrcode` 1.5 |
| Servidor da imagem | nginx 1.30 sem root (`nginxinc/nginx-unprivileged`) |
| Qualidade | ESLint 10 · Vitest 3 |
| Node.js (build) | 24 LTS (mínimo 22) |

## Variáveis

Nenhuma é segredo. As `VITE_*` entram no JavaScript entregue ao navegador.

| Variável | Quando | Padrão | Uso |
|---|---|---|---|
| `VITE_API_URL` | build | vazio = mesma origem | URL da API, só quando ela está em outro domínio e sem proxy |
| `VITE_TOTEM_URL` | build | endereço legado do Netlify | base pública do totem para os links/QR (hospedagem estática) |
| `API_PROXY_TARGET` | dev/preview | `http://localhost:3001` | para onde o Vite encaminha `/api` |
| `BACKEND_URL` | execução (contêiner) | — (**obrigatória**) | endereço interno da API para o proxy do nginx, sem caminho |
| `TOTEM_PUBLIC_URL` | execução (contêiner) | — (**obrigatória**) | base pública do totem no ambiente; vira `/config.js` e tem prioridade sobre `VITE_TOTEM_URL` |

Como a URL do totem é lida em tempo de execução (`/config.js`, gerado pelo nginx), a
**mesma imagem** serve homologação e produção, sem rebuild.

## Desenvolvimento local

Pré-requisitos: Node.js 22+ e o backend rodando (veja o README do repositório
backend). Por padrão a API é esperada em `http://localhost:3001`.

```bash
cp .env.example .env.local     # opcional: VITE_TOTEM_URL do totem local
npm install
npm run dev                    # http://localhost:5174
```

O navegador chama `/api/...` no próprio host e o Vite encaminha ao backend
(`API_PROXY_TARGET` troca o destino). Entre com um usuário criado pelo
`create-admin` do backend.

## Testes e build

```bash
npm run lint
npm test               # URL da API e montagem do link/QR do totem
npm run build          # gera dist/
```

## Docker

```bash
docker build -t totem-esg-dashboard .
docker run -p 8080:8080 \
  -e BACKEND_URL=http://<host-da-api>:3001 \
  -e TOTEM_PUBLIC_URL=https://<url-do-totem> totem-esg-dashboard
```

- Multi-stage: build com Node e entrega com nginx sem root (UID 101, porta 8080).
  Compatível com `readOnlyRootFilesystem` se `/tmp` e `/etc/nginx/conf.d` forem
  graváveis (`emptyDir`).
- Na inicialização as variáveis são validadas e a configuração do nginx é gerada a
  partir de [`nginx/default.conf.template`](nginx/default.conf.template). Sem elas, o
  contêiner não sobe e mostra a mensagem de erro.
- `GET /healthz` é a sonda do contêiner. Cabeçalhos `X-Frame-Options: DENY`,
  `nosniff` e `Referrer-Policy` são aplicados.
- Imagens base de espelho interno: `--build-arg NODE_IMAGE=...` e `--build-arg NGINX_IMAGE=...`.

## Comunicação com a API

O nginx da imagem encaminha `/api/*` para `BACKEND_URL` (proxy reverso/BFF). O
navegador fala só com a origem do dashboard, a API pode ficar interna ao cluster
(`ClusterIP`) e o CORS não entra em jogo. O login devolve um JWT, guardado em
`sessionStorage` e enviado em `Authorization: Bearer`. Não há cookies nem sessão no
servidor. Uma resposta 401 limpa a sessão e volta para `/login`. As permissões por
papel são verificadas no servidor; a interface apenas esconde o que o papel não pode
usar.

Rotas usadas: `/api/admin/*` (login, eventos, leads, respostas, indicadores,
relatório, exportação CSV, sincronização, usuários). O contrato completo está no
`openapi.yaml` do repositório backend. O limite de corpo do proxy é 4 MB, porque a
imagem do evento vai em base64. O ingress precisa aceitar o mesmo.

Integração externa: o cadastro de evento consulta o CEP direto no navegador
(`https://viacep.com.br`, sem credenciais). Se a rede corporativa ou uma CSP futura
bloquear esse domínio, o preenchimento automático do endereço deixa de funcionar e o
cadastro continua manual.

## Implantação (Azure DevOps → ACR → Argo CD)

- **Pipeline** ([`azure-pipelines.yml`](azure-pipelines.yml)): dispara só com
  mudanças em `dashboard/`, nas branches `dev`/`main` e em PRs para elas. Faz lint,
  testes, build e imagem. Em PR a imagem é só construída. Em `dev`/`main` ela vai
  para o ACR com as tags `<versão>-<branch>.<BuildId>` e `sha-<commit>`.
- **Kubernetes** ([`deploy/k8s`](deploy/k8s)): manifests de referência (Kustomize,
  overlays `hml`/`prd`). Usa `BACKEND_URL=http://totem-esg-backend` e
  `TOTEM_PUBLIC_URL` por ambiente. O Service da API precisa existir antes do
  dashboard subir.
- **Exposição**: HTTPS obrigatório. Por ser o painel administrativo, avalie
  publicá-lo só na rede interna/VPN.

### Pendências de infraestrutura

- service connection do ACR, pool de agentes, nome do ACR e namespaces (`__PREENCHER_*__`);
- domínio com TLS e regra de ingress/gateway (body size ≥ 4 MB) para `totem-esg-dashboard`;
- URL pública do totem em cada ambiente (`TOTEM_PUBLIC_URL`);
- espelho das imagens base se o Docker Hub for bloqueado;
- atualização da tag no repositório GitOps (padrão corporativo).

## Outros

- `netlify.toml` e `vercel.json` servem às hospedagens estáticas atuais e não são
  usados no Azure.
- O pacote `xlsx` 0.18.5 (última versão publicada no npm) tem alertas conhecidos que
  afetam a **leitura** de planilhas. O dashboard só **gera** arquivos, mas avalie
  migrar para a distribuição oficial da SheetJS (CDN) conforme a política da empresa.
