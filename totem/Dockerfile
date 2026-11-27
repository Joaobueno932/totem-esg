# Imagem do totem (PWA): build estático com Vite, servido por nginx sem root.
#   docker build -t totem-esg-totem .
#   docker run -p 8080:8080 -e BACKEND_URL=http://<host-da-api>:3001 totem-esg-totem
# As imagens base podem vir de um espelho interno (ex.: ACR) via --build-arg.
ARG NODE_IMAGE=node:24-alpine
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.30-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# A API é sempre a da mesma origem (/api, via nginx abaixo); o ?api= do link fica
# desligado para que um link adulterado não desvie as respostas para outro servidor.
ARG VITE_ALLOW_API_OVERRIDE=false
ENV VITE_API_URL= \
    VITE_ALLOW_API_OVERRIDE=${VITE_ALLOW_API_OVERRIDE}
RUN npm run build

FROM ${NGINX_IMAGE}
# Sem o site padrão da imagem e com conf.d gravável pelo usuário do nginx (101): se o
# entrypoint não puder gravar a configuração gerada, ele pula o template em silêncio.
USER root
RUN rm -f /etc/nginx/conf.d/default.conf && chown 101:0 /etc/nginx/conf.d && chmod 775 /etc/nginx/conf.d
USER 101
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 nginx/05-validar-ambiente.envsh /docker-entrypoint.d/05-validar-ambiente.envsh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
