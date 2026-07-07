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

4. Deploy. Você recebe uma URL tipo `https://carbono-zero-dashboard.vercel.app`.

> A `VITE_API_URL` é lida **no momento do build**. Se mudar a URL da API depois,
> faça um novo deploy (Redeploy) do dashboard.

---

## 4. Totem — Vercel (outro projeto)

1. **Add New → Project** de novo → mesmo repositório → **Root Directory:** `totem`.
2. Não precisa de variável de ambiente: o totem descobre a API na tela de
   configuração (você digita a URL lá dentro no dia do evento).
3. Deploy. Você recebe uma URL tipo `https://carbono-zero-totem.vercel.app`.

---

## 5. Fechar o CORS

Volte no Render (passo 2), edite `CORS_ORIGINS` e coloque as duas URLs finais,
separadas por vírgula, **sem `/` no fim**:

```
CORS_ORIGINS=https://carbono-zero-dashboard.vercel.app,https://carbono-zero-totem.vercel.app
```

Salve — o Render redeploya sozinho. Sem isso, o navegador bloqueia as chamadas.

---

## 6. Usar no evento

1. Abra o **dashboard**, faça login, crie o evento e anote o **ID**.
2. Abra o **totem** com `?config=1`
   (ex.: `https://carbono-zero-totem.vercel.app/?config=1`), informe o ID do
   evento e a URL da API. Toque em "Salvar e iniciar".
3. **Instale o totem no tablet** (menu do navegador → "Instalar app" / "Adicionar
   à tela inicial") ou abra em modo quiosque. Faça isso **uma vez com internet**
   para o Service Worker baixar o app — depois ele funciona offline.

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
- **Totem:** `https://...vercel.app` — PWA instalável (ou vira APK via PWABuilder)
