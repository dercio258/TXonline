#!/bin/bash

# Script para recarregar Nginx no host
# Pode ser chamado manualmente ou via cron após criação de subdomínios

set -e

# Testar configuração
if nginx -t > /dev/null 2>&1; then
    # Recarregar
    if systemctl reload nginx > /dev/null 2>&1; then
        exit 0
    else
        # Tentar recarregar via kill -HUP se systemctl falhar
        if [ -f /var/run/nginx.pid ]; then
            kill -HUP $(cat /var/run/nginx.pid) 2>/dev/null && exit 0
        fi
        exit 1
    fi
else
    exit 1
fi

