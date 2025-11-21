# Guia de Instalação Completa - VPS

## 📍 Situação Atual

Você está em: `root@vmi2818994:/var/www/mozloja.online`

Arquivos já presentes:
- `api-site-manager/` - Código da API
- Documentação (vários .md)

## 🚀 Passo a Passo Completo

### 1. Atualizar Sistema

```bash
apt update && apt upgrade -y
```

### 2. Instalar Docker

```bash
# Instalar dependências
apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Adicionar chave GPG do Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Adicionar repositório Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verificar instalação
docker --version
docker compose version
```

### 3. Instalar Docker Compose (se não veio com Docker)

```bash
# Baixar Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Tornar executável
chmod +x /usr/local/bin/docker-compose

# Verificar
docker-compose --version
```

### 4. Instalar Nginx

```bash
apt install -y nginx

# Verificar status
systemctl status nginx
systemctl enable nginx
```

### 5. Instalar Certbot (SSL)

```bash
apt install -y certbot python3-certbot-nginx

# Verificar
certbot --version
```

### 6. Instalar Node.js (se não usar Docker para API)

```bash
# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verificar
node --version
npm --version
```

### 7. Instalar PHP e WP-CLI (para WordPress)

```bash
# Instalar PHP e extensões
apt install -y php8.1-fpm php8.1-mysql php8.1-xml php8.1-curl php8.1-mbstring php8.1-zip

# Instalar WP-CLI
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar
mv wp-cli.phar /usr/local/bin/wp

# Verificar
wp --version
```

### 8. Instalar vsftpd (FTP)

```bash
apt install -y vsftpd

# Configurar vsftpd
nano /etc/vsftpd.conf
```

Adicionar/editar no arquivo:
```conf
listen=YES
anonymous_enable=NO
local_enable=YES
write_enable=YES
local_umask=022
dirmessage_enable=YES
use_localtime=YES
xferlog_enable=YES
connect_from_port_20=YES
chroot_local_user=YES
secure_chroot_dir=/var/run/vsftpd/empty
pam_service_name=vsftpd
rsa_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
rsa_private_key_file=/etc/ssl/private/ssl-cert-snakeoil.key
ssl_enable=YES
allow_writeable_chroot=YES
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=50000
user_config_dir=/etc/vsftpd/users
```

```bash
# Criar diretório de configuração de usuários
mkdir -p /etc/vsftpd/users

# Reiniciar vsftpd
systemctl restart vsftpd
systemctl enable vsftpd
```

### 9. Configurar Firewall

```bash
# Instalar UFW se não estiver instalado
apt install -y ufw

# Configurar regras
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 21/tcp    # FTP
ufw allow 40000:50000/tcp  # FTP Passive

# Ativar firewall
ufw enable

# Verificar status
ufw status
```

### 10. Configurar API

```bash
cd /var/www/mozloja.online/api-site-manager

# Copiar arquivo de exemplo
cp env.example .env

# Editar configurações
nano .env
```

**Configurar .env com:**
```env
NODE_ENV=production
PORT=3000

# API Security - GERAR CHAVES FORTES!
API_KEY=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# Database
DB_HOST=mysql
DB_PORT=3306
DB_USER=txuna_user
DB_PASSWORD=$(openssl rand -base64 16)  # Gerar senha forte
DB_NAME=txuna_sites
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 16)  # Gerar senha forte

# Domain
MAIN_DOMAIN=mozloja.online
API_DOMAIN=api.mozloja.online

# Paths
BASE_DIR=/var/www
API_PATH=/var/www/mozloja.online

# SSL
USE_SSL=true
SSL_EMAIL=admin@mozloja.online
CERTBOT_PATH=/usr/bin/certbot

# Storage
DEFAULT_STORAGE_LIMIT=1000
MAX_UPLOAD_SIZE=100

# WordPress
WP_ADMIN_USER=admin
WP_ADMIN_EMAIL=admin@mozloja.online
```

**Gerar senhas:**
```bash
# Gerar API_KEY
openssl rand -base64 32

# Gerar JWT_SECRET
openssl rand -base64 32

# Gerar senhas MySQL
openssl rand -base64 16
```

### 11. Criar Diretórios Necessários

```bash
# Criar diretórios
mkdir -p /var/www
mkdir -p /var/www/mozloja.online/api-site-manager/logs
mkdir -p /var/www/mozloja.online/api-site-manager/uploads/temp

# Ajustar permissões
chown -R $USER:$USER /var/www
chmod -R 755 /var/www
```

### 12. Configurar Nginx para API

```bash
# Executar script de configuração
cd /var/www/mozloja.online/api-site-manager
chmod +x scripts/setup-api-nginx.sh
./scripts/setup-api-nginx.sh
```

Ou manualmente:
```bash
nano /etc/nginx/sites-available/api.mozloja.online
```

Colar:
```nginx
upstream api_backend {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name api.mozloja.online;

    # Let's Encrypt validation
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
```

```bash
# Ativar site
ln -sf /etc/nginx/sites-available/api.mozloja.online /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

# Recarregar Nginx
systemctl reload nginx
```

### 13. Instalar SSL para API

```bash
# Instalar certificado SSL
certbot --nginx -d api.mozloja.online

# Verificar renovação automática
certbot renew --dry-run
```

### 14. Iniciar Aplicação com Docker

```bash
cd /var/www/mozloja.online/api-site-manager

# Construir e iniciar containers
docker compose up -d --build

# Verificar status
docker compose ps

# Ver logs
docker compose logs -f api
```

### 15. Verificar Funcionamento

```bash
# Health check
curl http://localhost:3000/health

# Ou via HTTPS (se SSL instalado)
curl https://api.mozloja.online/health
```

### 16. Configurar DNS

Certifique-se de que os seguintes registros DNS estão configurados:

```
A     api.mozloja.online    -> IP_DO_SERVIDOR
A     *.mozloja.online      -> IP_DO_SERVIDOR  (wildcard para subdomínios)
```

### 17. Testar Criação de Site

```bash
# Substituir SUA_API_KEY pela chave do .env
curl -X POST https://api.mozloja.online/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "subdomain": "teste",
    "type": "wordpress",
    "adminEmail": "test@mozloja.online"
  }'
```

## 🔧 Comandos Úteis

### Ver Logs

```bash
# Docker logs
docker compose logs -f api
docker compose logs -f mysql

# Nginx logs
tail -f /var/log/nginx/api-mozloja-*.log

# System logs
journalctl -u nginx -f
```

### Reiniciar Serviços

```bash
# Docker
docker compose restart

# Nginx
systemctl restart nginx

# vsftpd
systemctl restart vsftpd
```

### Verificar Status

```bash
# Docker containers
docker compose ps

# Serviços do sistema
systemctl status nginx
systemctl status vsftpd
systemctl status docker

# Espaço em disco
df -h
du -sh /var/www/*

# Memória
free -h
```

### Backup

```bash
# Backup MySQL
docker exec txuna-mysql mysqldump -u root -p$MYSQL_ROOT_PASSWORD --all-databases > backup_$(date +%Y%m%d).sql

# Backup volumes Docker
docker run --rm -v wp-site1-data:/data -v $(pwd):/backup alpine tar czf /backup/wp-site1_$(date +%Y%m%d).tar.gz /data
```

## ✅ Checklist de Instalação

- [ ] Sistema atualizado
- [ ] Docker instalado e funcionando
- [ ] Docker Compose instalado
- [ ] Nginx instalado e configurado
- [ ] Certbot instalado
- [ ] PHP e WP-CLI instalados
- [ ] vsftpd instalado e configurado
- [ ] Firewall configurado
- [ ] Arquivo .env configurado
- [ ] Diretórios criados
- [ ] Nginx configurado para API
- [ ] SSL instalado para API
- [ ] Docker containers rodando
- [ ] Health check funcionando
- [ ] DNS configurado
- [ ] Teste de criação de site funcionando

## 🆘 Troubleshooting

### Docker não inicia
```bash
systemctl status docker
journalctl -u docker -f
```

### Nginx não recarrega
```bash
nginx -t  # Verificar erros
systemctl status nginx
```

### SSL não instala
```bash
# Verificar se domínio aponta para o servidor
nslookup api.mozloja.online

# Verificar logs do certbot
certbot certificates
```

### API não responde
```bash
# Verificar se está rodando
docker compose ps

# Ver logs
docker compose logs api

# Verificar porta
netstat -tlnp | grep 3000
```

## 📝 Próximos Passos

1. Configurar backup automático
2. Configurar monitoramento
3. Configurar alertas
4. Documentar processos específicos

---

**Status**: Sistema pronto para uso! 🚀

