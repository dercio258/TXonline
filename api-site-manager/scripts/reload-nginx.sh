#!/bin/bash

# Script para recarregar Nginx no host
# Pode ser chamado manualmente ou via cron após criação de subdomínios

echo "🔄 Recarregando Nginx..."

# Testar configuração
if nginx -t; then
    # Recarregar
    systemctl reload nginx
    echo "✅ Nginx recarregado com sucesso"
    exit 0
else
    echo "❌ Erro na configuração do Nginx"
    exit 1
fi

