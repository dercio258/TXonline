# Quick Start - Configuração Rápida

## ⚠️ Problemas Comuns e Soluções

### 1. Variáveis de Ambiente Não Configuradas

**Erro:**
```
WARN[0000] The "MYSQL_ROOT_PASSWORD" variable is not set.
```

**Solução:**
```bash
cd /var/www/mozloja.online/api-site-manager

# Copiar arquivo de exemplo
cp env.example .env

# Editar e configurar TODAS as variáveis
nano .env
```

**Variáveis OBRIGATÓRIAS:**
```env
# Gerar senhas fortes:
API_KEY=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 16)
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 16)
```

### 2. Dockerfile com Pacotes PHP Incorretos

**Erro:**
```
ERROR: unable to select packages: php81 (no such package)
```

**Solução:** O Dockerfile foi corrigido. Se ainda tiver o erro:

```bash
# Fazer pull das mudanças mais recentes
git pull origin main

# Ou reconstruir sem cache
docker compose build --no-cache
```

### 3. Erro npm ci sem package-lock.json

**Erro:**
```
npm error The `npm ci` command can only install with an existing package-lock.json
```

**Solução:** O Dockerfile foi atualizado para usar `npm install`. Se ainda tiver o erro:

```bash
# Fazer pull das mudanças mais recentes
git pull origin main

# Reconstruir
docker compose build --no-cache
```

### 3. Versão Obsoleta no docker-compose.yml

**Aviso:**
```
the attribute `version` is obsolete
```

**Solução:** Já foi removido. Se ainda aparecer:

```bash
git pull origin main
```

## 🚀 Configuração Rápida (5 minutos)

### Passo 1: Configurar .env

```bash
cd /var/www/mozloja.online/api-site-manager

# Copiar exemplo
cp env.example .env

# Gerar senhas
echo "API_KEY=$(openssl rand -base64 32)" >> .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "DB_PASSWORD=$(openssl rand -base64 16)" >> .env
echo "MYSQL_ROOT_PASSWORD=$(openssl rand -base64 16)" >> .env

# Editar e completar configurações
nano .env
```

**Editar manualmente:**
- `MAIN_DOMAIN=mozloja.online`
- `API_DOMAIN=api.mozloja.online`
- `SSL_EMAIL=admin@mozloja.online`
- Substituir as senhas geradas acima

### Passo 2: Reconstruir Containers

```bash
# Parar containers existentes
docker compose down

# Reconstruir sem cache
docker compose build --no-cache

# Iniciar
docker compose up -d
```

### Passo 3: Verificar

```bash
# Ver logs
docker compose logs -f api

# Health check
curl http://localhost:3000/health
```

## ✅ Checklist Rápido

- [ ] Arquivo `.env` criado e configurado
- [ ] Todas as variáveis obrigatórias definidas
- [ ] Senhas geradas e seguras
- [ ] Dockerfile atualizado (git pull)
- [ ] Containers reconstruídos
- [ ] Health check funcionando

## 🔧 Comandos Úteis

```bash
# Ver variáveis do .env
cat .env | grep -v "^#" | grep -v "^$"

# Verificar se variáveis estão definidas
docker compose config

# Reconstruir apenas API
docker compose build --no-cache api

# Ver logs em tempo real
docker compose logs -f

# Parar tudo
docker compose down

# Limpar tudo e recomeçar
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

