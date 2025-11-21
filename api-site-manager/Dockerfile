# Dockerfile para API Site Manager
FROM node:18-alpine

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    bash \
    curl \
    nginx \
    mysql-client \
    php81 \
    php81-fpm \
    php81-mysqli \
    php81-xml \
    php81-curl \
    php81-mbstring \
    php81-zip \
    openssl

# Instalar WP-CLI
RUN curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar && \
    chmod +x wp-cli.phar && \
    mv wp-cli.phar /usr/local/bin/wp

# Criar diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências Node.js
RUN npm ci --only=production

# Copiar código da aplicação
COPY . .

# Criar diretórios necessários
RUN mkdir -p logs uploads/temp /var/www

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Comando para iniciar
CMD ["node", "server.js"]

