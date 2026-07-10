# Como hospedar em produção (passo a passo)

O sistema tem **3 partes** para colocar no ar, mais um **banco de dados**:

| Parte | O que é | Onde hospedar (sugestão gratuita/barata) |
|---|---|---|
| Banco | PostgreSQL | **Neon** (grátis) |
| API (`backend/`) | Servidor Node | **Render** ou **Railway** |
| Dashboard (`dashboard/`) | Site estático | **Vercel** ou **Netlify** |
| Totem (`totem/`) | Site estático / PWA | **Vercel** ou **Netlify** |

> **Regra de ouro:** tudo precisa estar em **HTTPS**. O totem só funciona
> offline (Service Worker/PWA) em endereço seguro — Vercel, Netlify e Render já
> dão HTTPS automático.

Antes de tudo, suba o código para um repositório no **GitHub** (as três pastas).
Todas as plataformas abaixo fazem deploy direto do GitHub.

---

## 1. Banco de dados — Neon (grátis)

1. Crie conta em <https://neon.tech>.
2. Crie um projeto → ele te dá uma **connection string** parecida com:
   `postgres://usuario:senha@ep-xxx.neon.tech/neondb?sslmode=require`
3. Guarde essa string — é o seu `DATABASE_URL`.

(Alternativas equivalentes: Supabase, Railway Postgres, ElephantSQL.)

---

## 2. API — Render (grátis para testar)

1. Crie conta em <https://render.com> e conecte seu GitHub.
2. **New → Web Service** → escolha o repositório → **Root Directory:** `backend`.
3. Render detecta o `Dockerfile` que já existe na pasta. (Se preferir sem Docker:
   Build `npm install`, Start `npm run migrate && npm run seed && npm start`.)
4. Em **Environment**, adicione as variáveis:

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | a connection string da Neon |
   | `JWT_SECRET` | uma senha longa e aleatória (invente 40+ caracteres) |
   | `JWT_EXPIRES_IN` | `8h` |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGINS` | as URLs do dashboard e do totem (preencher no passo 5) |

5. Faça o deploy. Render te dá uma URL tipo
   `https://carbono-zero-api.onrender.com` — essa é a **URL da API**.
6. Crie o primeiro admin. No painel do Render, aba **Shell**, rode:
   ```
   npm run create-admin seu@email.com "SuaSenhaForte" "Seu Nome"
   ```
   (O `migrate` e o `seed` já rodaram sozinhos no boot, pelo Dockerfile.)

> **Atenção ao plano grátis do Render:** ele "dorme" após 15 min sem uso e
> demora ~30s para acordar. Para um evento de verdade, use o plano **Starter
> (~US$7/mês)** ou o **Railway**, que não dormem. O totem não perde nada se a API
> dormir — as respostas ficam na fila local e sincronizam quando ela acordar.

---

## 3. Dashboard — Vercel

1. Crie conta em <https://vercel.com> e conecte o GitHub.
2. **Add New → Project** → escolha o repositório → **Root Directory:** `dashboard`.
3. Framework: Vite. Em **Environment Variables**, adicione:

   | Variável | Valor |
   |---|---|
   | `VITE_API_URL` | a URL da API do passo 2 (ex.: `https://carbono-zero-api.onrender.com`) |
   | `VITE_TOTEM_URL` | a URL pública do totem (passo 4, ex.: `https://totem-esg-totem.netlify.app`) — usada para montar o link/QR de cada evento |

4. Deploy. Você recebe uma URL tipo `https://carbono-zero-dashboard.vercel.app`.

> `VITE_API_URL` e `VITE_TOTEM_URL` são lidas **no momento do build**. Se mudar
> qualquer uma depois, faça um novo deploy (Redeploy) do dashboard.

---

## 4. Totem — Vercel/Netlify (outro projeto)

1. **Add New → Project** de novo → mesmo repositório → **Root Directory:** `totem`.
2. Em **Environment Variables**, adicione:

   | Variável | Valor |
   |---|---|
   | `VITE_API_URL` | a mesma URL da API do passo 2 |

   O totem **não tem mais tela de configuração**: a URL da API vem daqui (build)
   e o **evento vem do próprio link** (ex.: `.../festa-junina`). Cada evento
   criado no dashboard gera um link + QR code próprios.
3. Deploy. Você recebe uma URL tipo `https://totem-esg-totem.netlify.app`.
   Anote essa URL — é o `VITE_TOTEM_URL` do dashboard (passo 3).

---

## 5. Fechar o CORS

Volte no Render (passo 2), edite `CORS_ORIGINS` e coloque as duas URLs finais,
separadas por vírgula, **sem `/` no fim**:

```
CORS_ORIGINS=https://carbono-zero-dashboard.vercel.app,https://carbono-zero-totem.vercel.app
```

Salve — o Render redeploya sozinho. Sem isso, o navegador bloqueia as chamadas.

---

## 5.1. Migrações do banco (importante!)

Sempre que o **esquema** muda (novas colunas/tabelas), é preciso rodar as
migrações contra o banco de produção **antes** de o backend novo atender:

```
DATABASE_URL="<sua string do Neon>" npm run migrate
```

- No **Render com Dockerfile**, o `migrate` já roda no boot — nada a fazer.
- No **Netlify** (backend como Function, build `npm ci`), o `migrate` **não**
  roda sozinho: execute o comando acima uma vez após cada deploy que traga
  migração nova (a pasta `backend/migrations/` mostra o que existe).

> Sintoma de migração pendente: as abas **Dashboard** e **Respostas** dão
> *"failed to fetch"* (a consulta referencia uma coluna que ainda não existe e
> a Function cai). Rodar o `migrate` resolve.

---

## 6. Usar no evento

1. Abra o **dashboard**, faça login e **crie o evento**. Opcionalmente envie uma
   **imagem** — ela aparece na tela inicial do totem.
2. Na lista de eventos, clique em **Link/QR**: copie o link
   (ex.: `https://totem-esg-totem.netlify.app/festa-junina`) ou **baixe o QR code**.
3. Divulgue o QR no evento. Cada participante **escaneia** com o próprio celular,
   abre o totem já no evento certo, responde e envia. Não é preciso instalar nada.

> Se quiser usar um **tablet como totem fixo**, basta abrir o link do evento nele
> (ou "Adicionar à tela inicial"). O cálculo é local e a fila sincroniza sozinha.

---

## Usuários e papéis

No menu **Usuários** (visível só para administradores) o admin cria outros
acessos:

- **Administrador** — cria/edita eventos, gerencia usuários e exporta dados.
- **Visualizador** — apenas consulta dashboard, leads e respostas.

O primeiro admin é criado pela linha de comando (passo 2, `create-admin`); os
demais são criados por ele pela tela de Usuários.

---

## Sobre o "APK" (importante)

O totem é um **PWA**, não um app nativo — por isso ele **não precisa de APK**.
No tablet você usa "Adicionar à tela inicial" e ele vira um ícone/app em tela
cheia, funcionando offline. Para totem de evento, esse é o caminho recomendado
(nada de loja de apps, nada de instalar arquivo).

**Se você realmente quiser um arquivo `.apk`** (para a Play Store ou para
distribuir manualmente):

1. Hospede o totem primeiro (passo 4 acima).
2. Vá em <https://www.pwabuilder.com>, cole a URL do totem.
3. Ele valida o PWA e gera um **pacote Android (.apk / .aab)** pronto — é a forma
   oficial do Google (usa Trusted Web Activity por baixo).
4. Baixe o APK e instale no tablet, ou publique na Play Store com o `.aab`.

Ou seja: o APK, se você quiser, é gerado **a partir** do site do totem já
hospedado — não é um build separado do projeto.

---

## Resumão do que vai existir no fim

- **Banco:** Neon (privado, só a API acessa)
- **API:** `https://...onrender.com` — recebe sincronização e serve o dashboard
- **Dashboard:** `https://...vercel.app` — login da equipe
- **Totem:** `https://...netlify.app` — um link/QR por evento (`.../festa-junina`)
  que os participantes escaneiam
