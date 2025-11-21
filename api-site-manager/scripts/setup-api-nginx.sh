#!/bin/bash

# Script para configurar Nginx para a API em mozloja.online
# Uso: sudo ./setup-api-nginx.sh

API_DOMAIN="api.mozloja.online"
API_PATH="/var/www/mozloja.online"
API_PORT=3000

echo "Configurando Nginx para API: $API_DOMAIN"

# Criar configuração Nginx
cat > /etc/nginx/sites-available/api.mozloja.online <<EOF
upstream api_backend {
    server localhost:$API_PORT;
    keepalive 64;
}

server {
    listen 80;
    server_name $API_DOMAIN;

    # Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Logs
    access_log /var/log/nginx/api-mozloja-access.log;
    error_log /var/log/nginx/api-mozloja-error.log;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/api.mozloja.online /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

if [ $? -eq 0 ]; then
    echo "Configuração Nginx válida. Recarregando..."
    systemctl reload nginx
    echo "✅ Nginx configurado com sucesso!"
    echo ""
    echo "Próximo passo: Instalar SSL com:"
    echo "sudo certbot --nginx -d $API_DOMAIN"
else
    echo "❌ Erro na configuração do Nginx"
    exit 1
fi

