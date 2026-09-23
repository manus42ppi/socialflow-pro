FROM node:22-slim

# Typst binary installieren (aktuellste stabile Version)
ARG TYPST_VERSION=0.15.1
RUN apt-get update && apt-get install -y curl ca-certificates && \
    curl -fsSL "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-x86_64-unknown-linux-musl.tar.xz" \
    | tar -xJf - --strip-components=1 -C /usr/local/bin typst-x86_64-unknown-linux-musl/typst && \
    chmod +x /usr/local/bin/typst && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Nur server.js + fonts + templates kopieren (keine Test-Dateien/PDFs)
COPY package.json ./
RUN npm install

COPY server.js ./
COPY fonts ./fonts
COPY templates ./templates

ENV PORT=9000
EXPOSE 9000

CMD ["node", "server.js"]
