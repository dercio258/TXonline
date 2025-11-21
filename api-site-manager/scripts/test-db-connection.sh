#!/bin/bash

# Script para testar conexão com banco de dados
# Uso: ./test-db-connection.sh

echo "🔍 Testando conexão com banco de dados..."
echo ""

# Carregar variáveis do .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_HOST=${DB_HOST:-mysql}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-txuna_user}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME:-txuna_sites}

echo "Configuração:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Testar do host
echo "1. Testando do host..."
if command -v mysql &> /dev/null; then
    mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p"$DB_PASSWORD" -e "SELECT 1" $DB_NAME 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Conexão do host: OK"
    else
        echo "❌ Conexão do host: FALHOU"
    fi
else
    echo "⚠️  MySQL client não instalado no host"
fi
echo ""

# Testar do container
echo "2. Testando do container da API..."
docker compose exec -T api sh -c "ping -c 1 $DB_HOST" 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Resolução de DNS do container: OK"
else
    echo "❌ Resolução de DNS do container: FALHOU"
    echo "   Tentando com IP do host..."
    HOST_IP=$(ip route | grep default | awk '{print $3}')
    echo "   IP do host: $HOST_IP"
fi
echo ""

# Verificar rede Docker
echo "3. Verificando rede Docker..."
docker network inspect api-site-manager_txuna-network 2>/dev/null | grep -A 5 "Containers" || echo "Rede não encontrada"
echo ""

# Verificar containers
echo "4. Status dos containers:"
docker compose ps
echo ""

# Verificar variáveis de ambiente do container
echo "5. Variáveis de ambiente do container API:"
docker compose exec -T api sh -c "env | grep DB_" 2>&1
echo ""

echo "📝 Se a conexão falhar, verifique:"
echo "   1. MySQL container está rodando: docker compose ps mysql"
echo "   2. Variáveis DB_* estão corretas no .env"
echo "   3. Containers estão na mesma rede: docker network inspect api-site-manager_txuna-network"
echo "   4. MySQL está acessível: docker compose exec mysql mysql -u root -p\$MYSQL_ROOT_PASSWORD -e 'SELECT 1'"

