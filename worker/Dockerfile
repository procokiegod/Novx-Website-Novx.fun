# NOVX AI Compilation Worker
#
# Compiles Minecraft plugins inside isolated Docker containers.
# Deploy to a VPS, Fly.io, or Render (not Vercel).

FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    docker.io \
    zip \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --production || npm install --production

COPY server.js ./

ENV PORT=3001
EXPOSE 3001

CMD ["node", "server.js"]
