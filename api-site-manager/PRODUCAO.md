# Guia de Produção - TxunaSites API Manager

## 🚀 Configuração para Produção

### 1. Pré-requisitos na VPS

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker e Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Instalar Nginx
sudo apt install nginx -y

# Instalar Certbot (SSL)
sudo apt install certbot python3-certbot-nginx -y

# Instalar PM2 (gerenciador de processos Node.js)
sudo npm install -g pm2

# Instalar vsftpd (servidor FTP)
sudo apt install vsftpd -y
```

### 2. Configurar Firewall

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 21/tcp    # FTP
sudo ufw allow 40000:50000/tcp  # FTP Passive
sudo ufw enable
```

### 3. Configurar Nginx

Criar arquivo `/etc/nginx/sites-available/txuna-api`:

```nginx
upstream api_backend {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name api.txunasites.com;

    # Logs
    access_log /var/log/nginx/txuna-api-access.log;
    error_log /var/log/nginx/txuna-api-error.log;

    # Security headers
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

Ativar:
```bash
sudo ln -s /etc/nginx/sites-available/txuna-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Configurar SSL

```bash
sudo certbot --nginx -d api.txunasites.com
```

### 5. Configurar vsftpd (FTP)

Editar `/etc/vsftpd.conf`:

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

Reiniciar:
```bash
sudo systemctl restart vsftpd
sudo systemctl enable vsftpd
```

### 6. Deploy da Aplicação

```bash
# Clonar repositório
git clone <seu-repositorio> /opt/txuna-sites
cd /opt/txuna-sites/api-site-manager

# Configurar variáveis de ambiente
cp env.example .env
nano .env  # Editar com valores reais

# Criar diretórios necessários
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
mkdir -p logs uploads/temp

# Iniciar com Docker Compose
docker-compose up -d

# Ou iniciar com PM2 (se não usar Docker para API)
npm install --production
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Configurar para iniciar no boot
```

### 7. Configurar Monitoramento

#### PM2 Monitoring
```bash
pm2 monit
```

#### Logs
```bash
# PM2 logs
pm2 logs txuna-api-manager

# Docker logs
docker-compose logs -f api

# Nginx logs
sudo tail -f /var/log/nginx/txuna-api-*.log
```

### 8. Backup Automatizado

Criar script `/opt/backup-txuna.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backup/txuna"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup MySQL
docker exec txuna-mysql mysqldump -u root -p$MYSQL_ROOT_PASSWORD --all-databases > $BACKUP_DIR/mysql_$DATE.sql

# Backup volumes Docker
docker run --rm -v wp-site1-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/wp-site1_$DATE.tar.gz /data

# Manter apenas últimos 7 dias
find $BACKUP_DIR -type f -mtime +7 -delete
```

Agendar no cron:
```bash
crontab -e
# Adicionar:
0 2 * * * /opt/backup-txuna.sh
```

### 9. Monitoramento de Recursos

#### Ver uso de recursos dos containers
```bash
docker stats
```

#### Ver uso de disco
```bash
df -h
du -sh /var/www/*
```

#### Ver uso de memória
```bash
free -h
```

### 10. Segurança

1. **Firewall configurado** ✅
2. **SSL/TLS habilitado** ✅
3. **API Key forte** (no .env)
4. **Senhas de banco seguras**
5. **Permissões de arquivos corretas**
   ```bash
   sudo chmod 600 .env
   sudo chmod 750 /var/www
   ```

### 11. Variáveis de Ambiente de Produção

```env
NODE_ENV=production
PORT=3000

# API Security
API_KEY=<gerar-uma-chave-forte-aqui>
JWT_SECRET=<gerar-uma-chave-forte-aqui>

# Database
DB_HOST=mysql
DB_PORT=3306
DB_USER=txuna_user
DB_PASSWORD=<senha-forte>
DB_NAME=txuna_sites
MYSQL_ROOT_PASSWORD=<senha-root-forte>

# Paths
BASE_DIR=/var/www
MAIN_DOMAIN=txunasites.com

# Storage Limits
DEFAULT_STORAGE_LIMIT=1000  # MB
MAX_UPLOAD_SIZE=100  # MB

# SSL
USE_SSL=true
SSL_EMAIL=admin@txunasites.com
```

### 12. Testes de Produção

```bash
# Health check
curl https://api.txunasites.com/health

# Criar site
curl -X POST https://api.txunasites.com/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-api-key" \
  -d '{
    "subdomain": "teste",
    "type": "wordpress",
    "adminEmail": "test@example.com"
  }'

# Verificar monitoramento
curl -X GET https://api.txunasites.com/api/monitoring/all \
  -H "X-API-Key: sua-api-key"
```

### 13. Troubleshooting

#### API não inicia
```bash
# Ver logs
pm2 logs txuna-api-manager
# ou
docker-compose logs api

# Verificar banco de dados
docker-compose exec mysql mysql -u root -p
```

#### Containers WordPress não criam
```bash
# Verificar Docker socket
ls -la /var/run/docker.sock

# Verificar permissões
sudo usermod -aG docker $USER
```

#### FTP não funciona
```bash
# Verificar vsftpd
sudo systemctl status vsftpd
sudo tail -f /var/log/vsftpd.log
```

### 14. Atualizações

```bash
# Parar aplicação
pm2 stop txuna-api-manager
# ou
docker-compose down

# Atualizar código
git pull

# Reinstalar dependências
npm install --production

# Rebuild containers (se usar Docker)
docker-compose build

# Reiniciar
pm2 restart txuna-api-manager
# ou
docker-compose up -d
```

---

## ✅ Checklist de Produção

- [ ] Docker e Docker Compose instalados
- [ ] Nginx configurado e rodando
- [ ] SSL configurado (Let's Encrypt)
- [ ] Firewall configurado
- [ ] vsftpd instalado e configurado
- [ ] PM2 configurado (se não usar Docker para API)
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados inicializado
- [ ] Backup automatizado configurado
- [ ] Monitoramento configurado
- [ ] Logs configurados
- [ ] Testes realizados
- [ ] Documentação atualizada

