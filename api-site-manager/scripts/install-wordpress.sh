#!/bin/bash

# Script para instalação automática do WordPress
# Uso: ./install-wordpress.sh <site-path> <db-name> <db-user> <db-pass> <db-host> <admin-user> <admin-pass> <admin-email> <site-url>

SITE_PATH=$1
DB_NAME=$2
DB_USER=$3
DB_PASS=$4
DB_HOST=$5
ADMIN_USER=$6
ADMIN_PASS=$7
ADMIN_EMAIL=$8
SITE_URL=$9

if [ -z "$SITE_PATH" ] || [ -z "$DB_NAME" ]; then
    echo "Erro: Parâmetros insuficientes"
    exit 1
fi

# Verificar se WP-CLI está instalado
if ! command -v wp &> /dev/null; then
    echo "Erro: WP-CLI não está instalado"
    exit 1
fi

# Criar diretório se não existir
mkdir -p "$SITE_PATH"
cd "$SITE_PATH"

# Baixar WordPress
echo "Baixando WordPress..."
wp core download --allow-root

# Criar configuração
echo "Configurando WordPress..."
wp config create \
    --dbname="$DB_NAME" \
    --dbuser="$DB_USER" \
    --dbpass="$DB_PASS" \
    --dbhost="$DB_HOST" \
    --dbprefix="wp_" \
    --locale="pt_BR" \
    --allow-root

# Instalar WordPress
echo "Instalando WordPress..."
wp core install \
    --url="$SITE_URL" \
    --title="Site WordPress" \
    --admin_user="$ADMIN_USER" \
    --admin_password="$ADMIN_PASS" \
    --admin_email="$ADMIN_EMAIL" \
    --allow-root

echo "WordPress instalado com sucesso em $SITE_PATH"

