# Troubleshooting - Solução de Problemas

## 🔴 Erro 502 Bad Gateway

### Diagnóstico

O erro 502 significa que o Nginx está configurado, mas não consegue se conectar ao backend (API).

### Passos para Resolver

#### 1. Verificar se a API está rodando

```bash
cd /var/www/mozloja.online/api-site-manager

# Ver status dos containers
docker compose ps

# Ver logs da API
docker compose logs api

# Ver logs do MySQL
docker compose logs mysql
```

#### 2. Verificar se a API está respondendo na porta 3000

```bash
# Testar diretamente
curl http://localhost:3000/health

# Se não responder, verificar porta
netstat -tlnp | grep 3000
# ou
ss -tlnp | grep 3000
```

#### 3. Verificar configuração do Nginx

```bash
# Verificar configuração
cat /etc/nginx/sites-available/api.mozloja.online

# Testar configuração do Nginx
nginx -t

# Ver logs do Nginx
tail -f /var/log/nginx/api-mozloja-error.log
tail -f /var/log/nginx/api-mozloja-access.log
```

#### 4. Verificar variáveis de ambiente

```bash
cd /var/www/mozloja.online/api-site-manager

# Verificar se .env existe e está configurado
ls -la .env
cat .env | grep -v "^#" | grep -v "^$"

# Verificar se todas as variáveis estão definidas
docker compose config 2>&1 | grep -i "variable is not set"
```

#### 5. Reiniciar containers

```bash
cd /var/www/mozloja.online/api-site-manager

# Parar tudo
docker compose down

# Iniciar novamente
docker compose up -d

# Aguardar alguns segundos e verificar
sleep 5
docker compose ps
docker compose logs api
```

#### 6. Verificar conexão com banco de dados

```bash
# Verificar se MySQL está rodando
docker compose ps mysql

# Testar conexão
docker compose exec mysql mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT 1"

# Ver logs do MySQL
docker compose logs mysql | tail -20
```

#### 7. Verificar permissões do Docker socket

```bash
# Verificar se o container tem acesso ao Docker socket
ls -la /var/run/docker.sock

# Verificar se o usuário está no grupo docker
groups
```

## 🔧 Soluções Comuns

### Problema: API não inicia

**Sintomas:**
- Container para logo após iniciar
- Logs mostram erro

**Solução:**
```bash
# Ver logs completos
docker compose logs api

# Verificar .env
cat .env

# Reconstruir
docker compose build --no-cache api
docker compose up -d
```

### Problema: Erro de conexão com banco

**Sintomas:**
- Logs mostram "ECONNREFUSED" ou "Connection refused"

**Solução:**
```bash
# Verificar se MySQL está rodando
docker compose ps mysql

# Se não estiver, iniciar
docker compose up -d mysql

# Aguardar MySQL inicializar (pode levar 30-60 segundos)
sleep 30

# Verificar logs
docker compose logs mysql
```

### Problema: Porta 3000 já em uso

**Sintomas:**
- Erro ao iniciar container
- "port is already allocated"

**Solução:**
```bash
# Ver o que está usando a porta
lsof -i :3000
# ou
netstat -tlnp | grep 3000

# Parar processo ou mudar porta no docker-compose.yml
```

### Problema: Nginx não encontra backend

**Sintomas:**
- 502 Bad Gateway
- Nginx logs mostram "upstream not found"

**Solução:**
```bash
# Verificar se API está rodando
docker compose ps api

# Verificar se está na porta 3000
docker compose exec api netstat -tlnp | grep 3000

# Verificar configuração do Nginx
grep "proxy_pass" /etc/nginx/sites-available/api.mozloja.online

# Deve mostrar: proxy_pass http://api_backend;
# E upstream deve ser: server localhost:3000;
```

## 📋 Checklist de Diagnóstico

Execute estes comandos na ordem:

```bash
# 1. Status dos containers
docker compose ps

# 2. Logs da API
docker compose logs api --tail=50

# 3. Teste direto da API
curl http://localhost:3000/health

# 4. Teste via Nginx
curl http://api.mozloja.online/health
# ou
curl -H "Host: api.mozloja.online" http://localhost/health

# 5. Verificar Nginx
nginx -t
systemctl status nginx

# 6. Verificar .env
cat .env | grep -E "^(API_KEY|DB_PASSWORD|MYSQL_ROOT_PASSWORD)="

# 7. Verificar rede Docker
docker network ls
docker network inspect txuna-network
```

## 🚀 Solução Rápida (Reset Completo)

Se nada funcionar, tente resetar tudo:

```bash
cd /var/www/mozloja.online/api-site-manager

# 1. Parar tudo
docker compose down -v

# 2. Verificar .env
nano .env
# Certifique-se de que todas as variáveis estão definidas

# 3. Reconstruir
docker compose build --no-cache

# 4. Iniciar
docker compose up -d

# 5. Aguardar inicialização
sleep 10

# 6. Verificar
docker compose ps
docker compose logs api
curl http://localhost:3000/health
```

## 📞 Informações para Debug

Quando pedir ajuda, forneça:

```bash
# Status dos containers
docker compose ps

# Últimas 50 linhas de logs da API
docker compose logs api --tail=50

# Teste de health check
curl -v http://localhost:3000/health

# Configuração do Nginx
cat /etc/nginx/sites-available/api.mozloja.online

# Erros do Nginx
tail -20 /var/log/nginx/api-mozloja-error.log
```

