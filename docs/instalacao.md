# Instalação

## Requisitos

- Node.js 20 ou superior
- PostgreSQL 14+ (ou Docker, usando o `docker-compose.yml` da raiz)
- Navegador moderno (Chrome/Edge recomendados para o modo quiosque)

## Desenvolvimento local

### 1. Banco de dados

```bash
docker compose up -d
```

Ou aponte `DATABASE_URL` para um PostgreSQL existente.

### 2. Backend

```bash
cd backend
cp .env.example .env          # ajuste DATABASE_URL, JWT_SECRET, CORS_ORIGINS
npm install
npm run migrate               # cria as tabelas (idempotente)
npm run seed                  # insere os fatores de emissão versionados
npm run create-admin admin@evento.com "SenhaForte123" "Nome do Admin"
npm run dev                   # http://localhost:3001
```

### 3. Totem

```bash
cd totem
npm install
npm run dev                   # http://localhost:5173
```

Em desenvolvimento o Service Worker não é gerado. Para validar o comportamento
offline real:

```bash
npm run build
npm run preview               # http://localhost:4173
```

### 4. Dashboard

```bash
cd dashboard
cp .env.example .env          # VITE_API_URL=http://localhost:3001
npm install
npm run dev                   # http://localhost:5174
```

### 5. Configuração inicial

1. Faça login no dashboard e crie um evento em **Eventos** — anote o **ID**.
2. Abra o totem com `?config=1` (ou toque 7 vezes no canto superior esquerdo da
   tela inicial), informe o ID do evento, o nome exibido e a URL da API.
3. Pronto: o totem já grava respostas localmente e sincroniza quando houver rede.

## Produção

### Backend

- Hospede o Node.js (PM2, systemd, Docker etc.) atrás de um proxy HTTPS
  (Nginx/Caddy). **HTTPS é obrigatório**: Service Worker e PWA só funcionam em
  origem segura.
- Defina obrigatoriamente: `NODE_ENV=production`, `JWT_SECRET` forte,
  `DATABASE_URL` do banco gerenciado, `CORS_ORIGINS` com os domínios reais do
  totem e do dashboard (nunca `*`).
- Rode `npm run migrate` e `npm run seed` a cada deploy (ambos idempotentes).
- Faça backup regular do PostgreSQL — os dados pessoais coletados estão lá.

### Totem e dashboard (estáticos)

```bash
cd totem && npm run build       # gera totem/dist
cd dashboard && npm run build   # gera dashboard/dist
```

- Sirva cada `dist/` como site estático (Nginx, Vercel, Netlify, S3+CDN…),
  cada um em seu domínio/subdomínio, sempre com HTTPS.
- No dashboard, defina `VITE_API_URL` **antes** do build.
- Ambos são SPAs: configure fallback de rotas para `index.html`.

### Preparação do totem no evento

1. **Com internet**, abra a URL do totem uma vez no dispositivo — o Service
   Worker baixa e guarda todo o app.
2. Configure o evento (`?config=1`) e instale como app (menu "Instalar
   aplicativo") ou abra o navegador em modo quiosque:
   `chrome --kiosk https://totem.seudominio.com.br`
3. A partir daí o totem funciona **sem internet**. As respostas ficam na fila
   local e sincronizam sozinhas quando a rede voltar (ou leve o dispositivo a
   um local com internet após o evento e toque em "Sincronizar agora" na tela
   de configuração).
4. Antes de desligar/reinstalar o dispositivo, confirme na tela de configuração
   que há **0 respostas pendentes** — a fila vive no IndexedDB do navegador e é
   apagada se o perfil/dados do navegador forem limpos.
