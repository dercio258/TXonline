# Deploy da API em mozloja.online

## 📍 Configuração

- **Domínio Principal**: `mozloja.online`
- **API Domain**: `api.mozloja.online`
- **Path da API**: `/var/www/mozloja.online`
- **SSL**: Automático com Let's Encrypt

## 🚀 Passo a Passo de Deploy

### 1. Preparar Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y nginx certbot python3-certbot-nginx docker.io docker-compose git curl

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clonar e Configurar API

```bash
# Criar diretório
sudo mkdir -p /var/www/mozloja.online
sudo chown -R $USER:$USER /var/www/mozloja.online

# Clonar repositório (ou copiar arquivos)
cd /var/www/mozloja.online
git clone <seu-repositorio> .

# Ou copiar arquivos manualmente
# cp -r api-site-manager/* /var/www/mozloja.online/
```

### 3. Configurar Variáveis de Ambiente

```bash
cd /var/www/mozloja.online
cp env.example .env
nano .env
```

Editar `.env`:
```env
NODE_ENV=production
PORT=3000

# API Security
API_KEY=GERAR_UMA_CHAVE_FORTE_AQUI
JWT_SECRET=GERAR_OUTRA_CHAVE_FORTE_AQUI

# Database
DB_HOST=mysql
DB_PORT=3306
DB_USER=txuna_user
DB_PASSWORD=SENHA_FORTE_MYSQL
DB_NAME=txuna_sites
MYSQL_ROOT_PASSWORD=SENHA_ROOT_FORTE

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
```

### 4. Configurar Nginx para API

```bash
# Executar script de configuração
cd /var/www/mozloja.online
chmod +x scripts/setup-api-nginx.sh
sudo ./scripts/setup-api-nginx.sh
```

Ou manualmente:
```bash
sudo nano /etc/nginx/sites-available/api.mozloja.online
```

Colar configuração (ver `scripts/setup-api-nginx.sh`)

```bash
sudo ln -s /etc/nginx/sites-available/api.mozloja.online /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Instalar SSL para API

```bash
sudo certbot --nginx -d api.mozloja.online
```

### 6. Iniciar Aplicação

#### Opção A: Docker Compose (Recomendado)

```bash
cd /var/www/mozloja.online
docker-compose up -d
```

#### Opção B: PM2

```bash
cd /var/www/mozloja.online
npm install --production
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 7. Verificar Funcionamento

```bash
# Health check
curl https://api.mozloja.online/health

# Deve retornar:
# {"status":"ok","timestamp":"...","service":"TxunaSites API Manager"}
```

### 8. Testar Criação de Site

```bash
# Criar site WordPress
curl -X POST https://api.mozloja.online/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "subdomain": "teste",
    "type": "wordpress",
    "adminEmail": "test@mozloja.online"
  }'
```

## 🔧 Configuração de DNS

Certifique-se de que os seguintes registros DNS estão configurados:

```
A     api.mozloja.online    -> IP_DO_SERVIDOR
A     *.mozloja.online      -> IP_DO_SERVIDOR  (wildcard para subdomínios)
```

## 📊 Monitoramento

### Ver Logs

```bash
# Docker
docker-compose logs -f api

# PM2
pm2 logs txuna-api-manager

# Nginx
sudo tail -f /var/log/nginx/api-mozloja-*.log
```

### Ver Status

```bash
# Docker
docker-compose ps

# PM2
pm2 status
```

## 🔒 Segurança

1. **Firewall**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

2. **Permissões**
```bash
sudo chmod 600 /var/www/mozloja.online/.env
sudo chown -R $USER:$USER /var/www/mozloja.online
```

3. **API Key Forte**
```bash
# Gerar API key
openssl rand -base64 32
```

## 🔄 Atualizações

```bash
cd /var/www/mozloja.online

# Parar aplicação
docker-compose down
# ou
pm2 stop txuna-api-manager

# Atualizar código
git pull
# ou copiar novos arquivos

# Rebuild (se Docker)
docker-compose build

# Reiniciar
docker-compose up -d
# ou
pm2 restart txuna-api-manager
```

## ✅ Checklist de Deploy

- [ ] Servidor preparado (Docker, Nginx, Certbot)
- [ ] Código copiado para `/var/www/mozloja.online`
- [ ] `.env` configurado com valores corretos
- [ ] Nginx configurado para `api.mozloja.online`
- [ ] SSL instalado para API
- [ ] Aplicação rodando (Docker ou PM2)
- [ ] Health check funcionando
- [ ] DNS configurado
- [ ] Firewall configurado
- [ ] Teste de criação de site funcionando

## 🆘 Troubleshooting

### API não responde
```bash
# Verificar se está rodando
docker-compose ps
# ou
pm2 status

# Ver logs
docker-compose logs api
# ou
pm2 logs
```

### SSL não funciona
```bash
# Verificar certificado
sudo certbot certificates

# Renovar manualmente
sudo certbot renew
```

### Erro de conexão com banco
```bash
# Verificar se MySQL está rodando
docker-compose ps mysql

# Ver logs do MySQL
docker-compose logs mysql
```

## 📝 Próximos Passos

1. Configurar backup automático
2. Configurar monitoramento (Prometheus/Grafana)
3. Configurar alertas
4. Documentar processos internos

