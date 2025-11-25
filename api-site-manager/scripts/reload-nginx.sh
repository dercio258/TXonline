#!/bin/bash

# Script para reiniciar Nginx no host
# Pode ser chamado manualmente ou via cron após criação de subdomínios

set -e

# Testar configuração
if nginx -t > /dev/null 2>&1; then
    # Reiniciar (mais robusto que reload)
    if systemctl restart nginx > /dev/null 2>&1; then
        echo "Nginx restarted successfully"
        exit 0
    else
        # Tentar reiniciar via kill se systemctl falhar
        if [ -f /var/run/nginx.pid ]; then
            PID=$(cat /var/run/nginx.pid)
            kill -TERM $PID 2>/dev/null
            sleep 1
            nginx 2>/dev/null && exit 0
        fi
        echo "Failed to restart Nginx" >&2
        exit 1
    fi
else
    echo "Nginx configuration test failed" >&2
    exit 1
fi

