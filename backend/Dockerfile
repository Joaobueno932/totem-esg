# Imagem de produção da API Pegada de Carbono.
#   docker build -t totem-esg-backend .
# A imagem base pode vir de um espelho interno (ex.: ACR): --build-arg NODE_IMAGE=<registro>/node:24-alpine
ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM ${NODE_IMAGE}
ENV NODE_ENV=production \
    PORT=3001
WORKDIR /app

# Código de propriedade do root: o processo (usuário sem privilégios) só lê.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY migrations ./migrations
COPY seeds ./seeds
COPY scripts/migrate.js scripts/seed.js scripts/create-admin.js scripts/create-admin-env.js ./scripts/

# 1000 = usuário "node" da imagem base (numérico para o runAsNonRoot do Kubernetes).
USER 1000
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1

# migrate e seed são idempotentes: rodam a cada boot sem duplicar dados. O admin inicial
# só é criado/atualizado se ADMIN_EMAIL e ADMIN_PASSWORD estiverem definidos.
# O exec faz o node virar o PID 1 e receber o SIGTERM do orquestrador (src/server.js).
CMD ["sh", "-c", "node scripts/migrate.js && node scripts/seed.js && node scripts/create-admin-env.js && exec node src/server.js"]
