#!/bin/bash

# Script para corrigir estrutura do banco de dados
# Uso: ./fix-database.sh

set -e

echo "🔧 Corrigindo estrutura do banco de dados..."

# Carregar variáveis do .env se existir
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_HOST=${DB_HOST:-mysql}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-txuna_user}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME:-txuna_sites}

# Se DB_HOST for 'mysql', usar docker exec
if [ "$DB_HOST" = "mysql" ]; then
    echo "Executando migração via Docker..."
    docker compose exec -T mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD:-$DB_PASSWORD}" < scripts/migrate-db.sql
else
    echo "Executando migração diretamente..."
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < scripts/migrate-db.sql
fi

echo "✅ Migração concluída!"
echo ""
echo "Verificando estrutura da tabela sites:"
if [ "$DB_HOST" = "mysql" ]; then
    docker compose exec -T mysql mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE sites;"
else
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE sites;"
fi

