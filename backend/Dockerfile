# Imagem de produção da API Carbono Zero.
# Funciona em Render, Railway, Fly.io, VPS com Docker, etc.
FROM node:20-alpine

WORKDIR /app

# instala só dependências de produção
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
# a plataforma injeta a porta em PORT; localmente cai no 3001
EXPOSE 3001

# migrate e seed são idempotentes: rodam a cada boot sem duplicar dados
CMD ["sh", "-c", "npm run migrate && npm run seed && npm start"]
