#!/bin/bash

# Script para criar configuração de subdomínio no Nginx
# Uso: ./create-subdomain.sh <subdomain> <domain> <site-path>

SUBDOMAIN=$1
DOMAIN=$2
SITE_PATH=$3

if [ -z "$SUBDOMAIN" ] || [ -z "$DOMAIN" ] || [ -z "$SITE_PATH" ]; then
    echo "Erro: Parâmetros insuficientes"
    exit 1
fi

NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
FULL_DOMAIN="${SUBDOMAIN}.${DOMAIN}"

# Detectar versão do PHP automaticamente
PHP_SOCKET=$(ls /var/run/php/php*-fpm.sock 2>/dev/null | head -n1)
if [ -z "$PHP_SOCKET" ]; then
    # Fallback para PHP 8.3 (versão mais recente comum)
    PHP_SOCKET="/var/run/php/php8.3-fpm.sock"
fi

# Criar configuração Nginx
CONFIG_FILE="${NGINX_AVAILABLE}/${SUBDOMAIN}"

cat > "$CONFIG_FILE" <<EOF
server {
    listen 80;
    server_name ${FULL_DOMAIN};
    
    root ${SITE_PATH};
    index index.html index.php;
    
    access_log /var/log/nginx/${SUBDOMAIN}-access.log;
    error_log /var/log/nginx/${SUBDOMAIN}-error.log;
    
    location / {
        try_files \$uri \$uri/ /index.php?\$args;
    }
    
    location ~ \\.php$ {
        fastcgi_pass unix:${PHP_SOCKET};
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        include fastcgi_params;
    }
    
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# Criar symlink
ln -sf "$CONFIG_FILE" "${NGINX_ENABLED}/${SUBDOMAIN}"

# Testar configuração
if nginx -t; then
    systemctl reload nginx
    echo "Subdomínio ${FULL_DOMAIN} criado com sucesso"
else
    echo "Erro: Configuração do Nginx inválida"
    exit 1
fi

