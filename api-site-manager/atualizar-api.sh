#!/bin/bash

# Script para atualizar e reconstruir a API
# Execute: bash atualizar-api.sh

set -e

echo "🔄 Atualizando código do repositório..."
cd /var/www/mozloja.online/api-site-manager
git pull origin main

echo "🔨 Reconstruindo container da API..."
docker compose build --no-cache api

echo "🛑 Parando container..."
docker compose stop api

echo "🚀 Iniciando container..."
docker compose up -d api

echo "⏳ Aguardando inicialização..."
sleep 5

echo "📋 Verificando logs..."
docker compose logs api --tail=10

echo ""
echo "✅ Atualização concluída!"
echo ""
echo "Teste com:"
echo "curl -X POST http://localhost:3000/api/sites \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'X-API-Key: \$API_KEY' \\"
echo "  -d '{\"subdomain\": \"teste\", \"type\": \"static\"}'"

