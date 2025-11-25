#!/bin/bash

# Script de Instalação Completa - TxunaSites API Manager
# Execute como root: sudo bash script-instalacao-completa.sh

set -e

echo "🚀 Iniciando instalação completa do TxunaSites API Manager..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Atualizar Sistema
echo -e "${GREEN}[1/15]${NC} Atualizando sistema..."
apt update && apt upgrade -y
echo -e "${GREEN}✓${NC} Sistema atualizado"
echo ""

# 2. Instalar Docker
echo -e "${GREEN}[2/15]${NC} Instalando Docker..."
if command_exists docker; then
    echo -e "${YELLOW}⚠${NC} Docker já está instalado"
else
    apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✓${NC} Docker instalado: $(docker --version)"
fi
echo ""

# 3. Instalar Docker Compose (standalone se necessário)
echo -e "${GREEN}[3/15]${NC} Verificando Docker Compose..."
if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC} Docker Compose já está instalado"
else
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓${NC} Docker Compose instalado"
fi
echo ""

# 4. Instalar Nginx
echo -e "${GREEN}[4/15]${NC} Instalando Nginx..."
if command_exists nginx; then
    echo -e "${YELLOW}⚠${NC} Nginx já está instalado"
else
    apt install -y nginx
    systemctl enable nginx
    systemctl start nginx
    echo -e "${GREEN}✓${NC} Nginx instalado"
fi
echo ""

# 5. Instalar Certbot
echo -e "${GREEN}[5/15]${NC} Instalando Certbot..."
if command_exists certbot; then
    echo -e "${YELLOW}⚠${NC} Certbot já está instalado"
else
    apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✓${NC} Certbot instalado"
fi
echo ""

# 6. Instalar Node.js (opcional, se não usar Docker)
echo -e "${GREEN}[6/15]${NC} Instalando Node.js..."
if command_exists node; then
    echo -e "${YELLOW}⚠${NC} Node.js já está instalado: $(node --version)"
else
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    echo -e "${GREEN}✓${NC} Node.js instalado: $(node --version)"
fi
echo ""

# 7. Instalar PHP e WP-CLI
echo -e "${GREEN}[7/15]${NC} Instalando PHP e WP-CLI..."
if command_exists php; then
    echo -e "${YELLOW}⚠${NC} PHP já está instalado: $(php --version | head -n 1)"
else
    # Tentar instalar PHP 8.3 primeiro (versão mais recente)
    if apt-cache show php8.3-fpm &>/dev/null; then
        apt install -y php8.3-fpm php8.3-mysql php8.3-xml php8.3-curl php8.3-mbstring php8.3-zip
        echo -e "${GREEN}✓${NC} PHP 8.3 instalado"
    elif apt-cache show php8.2-fpm &>/dev/null; then
        apt install -y php8.2-fpm php8.2-mysql php8.2-xml php8.2-curl php8.2-mbstring php8.2-zip
        echo -e "${GREEN}✓${NC} PHP 8.2 instalado"
    elif apt-cache show php8.1-fpm &>/dev/null; then
        apt install -y php8.1-fpm php8.1-mysql php8.1-xml php8.1-curl php8.1-mbstring php8.1-zip
        echo -e "${GREEN}✓${NC} PHP 8.1 instalado"
    else
        # Fallback para versão padrão do repositório
        apt install -y php-fpm php-mysql php-xml php-curl php-mbstring php-zip
        echo -e "${GREEN}✓${NC} PHP instalado (versão padrão do repositório)"
    fi
fi

if command_exists wp; then
    echo -e "${YELLOW}⚠${NC} WP-CLI já está instalado"
else
    curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
    chmod +x wp-cli.phar
    mv wp-cli.phar /usr/local/bin/wp
    echo -e "${GREEN}✓${NC} WP-CLI instalado: $(wp --version)"
fi
echo ""

# 8. Instalar vsftpd
echo -e "${GREEN}[8/15]${NC} Instalando vsftpd..."
if command_exists vsftpd; then
    echo -e "${YELLOW}⚠${NC} vsftpd já está instalado"
else
    apt install -y vsftpd
    mkdir -p /etc/vsftpd/users
    systemctl enable vsftpd
    systemctl start vsftpd
    echo -e "${GREEN}✓${NC} vsftpd instalado"
fi
echo ""

# 9. Configurar Firewall
echo -e "${GREEN}[9/15]${NC} Configurando firewall..."
if command_exists ufw; then
    ufw --force allow 22/tcp
    ufw --force allow 80/tcp
    ufw --force allow 443/tcp
    ufw --force allow 21/tcp
    ufw --force allow 40000:50000/tcp
    ufw --force enable
    echo -e "${GREEN}✓${NC} Firewall configurado"
else
    apt install -y ufw
    ufw --force allow 22/tcp
    ufw --force allow 80/tcp
    ufw --force allow 443/tcp
    ufw --force allow 21/tcp
    ufw --force allow 40000:50000/tcp
    ufw --force enable
    echo -e "${GREEN}✓${NC} Firewall instalado e configurado"
fi
echo ""

# 10. Criar Diretórios
echo -e "${GREEN}[10/15]${NC} Criando diretórios necessários..."
mkdir -p /var/www
mkdir -p /var/www/mozloja.online/api-site-manager/logs
mkdir -p /var/www/mozloja.online/api-site-manager/uploads/temp
chown -R $USER:$USER /var/www 2>/dev/null || chown -R root:root /var/www
chmod -R 755 /var/www
echo -e "${GREEN}✓${NC} Diretórios criados"
echo ""

# 11. Configurar .env
echo -e "${GREEN}[11/15]${NC} Configurando arquivo .env..."
cd /var/www/mozloja.online/api-site-manager

if [ -f .env ]; then
    echo -e "${YELLOW}⚠${NC} Arquivo .env já existe. Fazendo backup..."
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

if [ ! -f .env ]; then
    cp env.example .env
    echo -e "${GREEN}✓${NC} Arquivo .env criado a partir de env.example"
    echo -e "${YELLOW}⚠${NC} IMPORTANTE: Edite o arquivo .env com suas configurações!"
    echo -e "${YELLOW}   ${NC} Execute: nano /var/www/mozloja.online/api-site-manager/.env"
else
    echo -e "${YELLOW}⚠${NC} Arquivo .env já existe"
fi
echo ""

# 12. Configurar Nginx para API
echo -e "${GREEN}[12/15]${NC} Configurando Nginx para API..."
if [ -f /etc/nginx/sites-available/api.mozloja.online ]; then
    echo -e "${YELLOW}⚠${NC} Configuração Nginx já existe"
else
    cat > /etc/nginx/sites-available/api.mozloja.online <<'EOF'
upstream api_backend {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name api.mozloja.online;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    access_log /var/log/nginx/api-mozloja-access.log;
    error_log /var/log/nginx/api-mozloja-error.log;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

    ln -sf /etc/nginx/sites-available/api.mozloja.online /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
    echo -e "${GREEN}✓${NC} Nginx configurado"
fi
echo ""

# 13. Instalar SSL (com confirmação)
echo -e "${GREEN}[13/15]${NC} Instalação de SSL..."
echo -e "${YELLOW}⚠${NC} Para instalar SSL, execute manualmente:"
echo -e "${YELLOW}   ${NC} certbot --nginx -d api.mozloja.online"
echo ""

# 14. Iniciar Docker Containers
echo -e "${GREEN}[14/15]${NC} Iniciando containers Docker..."
cd /var/www/mozloja.online/api-site-manager

if [ -f docker-compose.yml ]; then
    echo -e "${YELLOW}⚠${NC} Verificando se .env está configurado..."
    if grep -q "your-secret-api-key-here" .env 2>/dev/null; then
        echo -e "${RED}✗${NC} Arquivo .env não foi configurado!"
        echo -e "${YELLOW}   ${NC} Configure o .env antes de iniciar os containers"
    else
        docker compose up -d --build
        echo -e "${GREEN}✓${NC} Containers Docker iniciados"
        echo -e "${GREEN}   ${NC} Verificar status: docker compose ps"
        echo -e "${GREEN}   ${NC} Ver logs: docker compose logs -f"
    fi
else
    echo -e "${RED}✗${NC} docker-compose.yml não encontrado!"
fi
echo ""

# 15. Verificar Instalação
echo -e "${GREEN}[15/15]${NC} Verificando instalação..."
echo ""
echo "=== Status dos Serviços ==="
systemctl is-active --quiet docker && echo -e "${GREEN}✓${NC} Docker: Ativo" || echo -e "${RED}✗${NC} Docker: Inativo"
systemctl is-active --quiet nginx && echo -e "${GREEN}✓${NC} Nginx: Ativo" || echo -e "${RED}✗${NC} Nginx: Inativo"
systemctl is-active --quiet vsftpd && echo -e "${GREEN}✓${NC} vsftpd: Ativo" || echo -e "${RED}✗${NC} vsftpd: Inativo"

echo ""
echo "=== Versões Instaladas ==="
docker --version 2>/dev/null || echo "Docker: Não instalado"
docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || echo "Docker Compose: Não instalado"
nginx -v 2>&1 | head -n 1 || echo "Nginx: Não instalado"
certbot --version 2>/dev/null || echo "Certbot: Não instalado"
node --version 2>/dev/null || echo "Node.js: Não instalado"
php --version 2>/dev/null | head -n 1 || echo "PHP: Não instalado"
wp --version 2>/dev/null || echo "WP-CLI: Não instalado"

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Instalação concluída!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. Configure o arquivo .env:"
echo "   nano /var/www/mozloja.online/api-site-manager/.env"
echo ""
echo "2. Instale SSL para a API:"
echo "   certbot --nginx -d api.mozloja.online"
echo ""
echo "3. Inicie os containers Docker:"
echo "   cd /var/www/mozloja.online/api-site-manager"
echo "   docker compose up -d"
echo ""
echo "4. Verifique o funcionamento:"
echo "   curl http://localhost:3000/health"
echo "   ou"
echo "   curl https://api.mozloja.online/health"
echo ""
echo "5. Configure DNS:"
echo "   A     api.mozloja.online    -> IP_DO_SERVIDOR"
echo "   A     *.mozloja.online      -> IP_DO_SERVIDOR"
echo ""
echo "📚 Documentação completa em: INSTALACAO_VPS.md"
echo ""

