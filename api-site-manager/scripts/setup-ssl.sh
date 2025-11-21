#!/bin/bash

# Script para configurar SSL com Let's Encrypt
# Uso: ./setup-ssl.sh <domain> <email>

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Erro: Parâmetros insuficientes"
    exit 1
fi

# Verificar se certbot está instalado
if ! command -v certbot &> /dev/null; then
    echo "Erro: Certbot não está instalado"
    exit 1
fi

# Obter certificado SSL
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL"

if [ $? -eq 0 ]; then
    echo "SSL configurado com sucesso para $DOMAIN"
else
    echo "Erro ao configurar SSL"
    exit 1
fi

