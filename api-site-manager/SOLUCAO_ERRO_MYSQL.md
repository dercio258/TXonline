# Solução: Erro "getaddrinfo EAI_AGAIN mysql"

## 🔴 Problema

```
getaddrinfo EAI_AGAIN mysql
```

O container da API não consegue resolver o hostname "mysql" (DNS não funciona).

## ✅ Soluções

### Solução 1: Verificar se MySQL está rodando

```bash
cd /var/www/mozloja.online/api-site-manager

# Ver status
docker compose ps mysql

# Se não estiver rodando, iniciar
docker compose up -d mysql

# Aguardar MySQL inicializar (30-60 segundos)
sleep 30

# Verificar logs
docker compose logs mysql
```

### Solução 2: Verificar rede Docker

```bash
# Verificar se containers estão na mesma rede
docker network inspect api-site-manager_txuna-network

# Verificar se MySQL está na rede
docker inspect txuna-mysql | grep -A 10 Networks

# Verificar se API está na rede
docker inspect txuna-api | grep -A 10 Networks
```

### Solução 3: Reiniciar containers na ordem correta

```bash
cd /var/www/mozloja.online/api-site-manager

# Parar tudo
docker compose down

# Iniciar MySQL primeiro
docker compose up -d mysql

# Aguardar MySQL estar pronto
sleep 30

# Verificar se MySQL está respondendo
docker compose exec mysql mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT 1"

# Iniciar API
docker compose up -d api

# Verificar logs
docker compose logs api
```

### Solução 4: Testar resolução de DNS do container

```bash
# Testar se container consegue resolver "mysql"
docker compose exec api ping -c 1 mysql

# Se não funcionar, testar com IP
docker compose exec mysql hostname -i
# Anotar o IP e testar:
docker compose exec api ping -c 1 <IP_DO_MYSQL>
```

### Solução 5: Usar IP diretamente (temporário)

Se o DNS não funcionar, pode usar o IP do container MySQL:

```bash
# Descobrir IP do MySQL
MYSQL_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' txuna-mysql)
echo "MySQL IP: $MYSQL_IP"

# Editar .env temporariamente
# DB_HOST=<IP_DO_MYSQL>
```

### Solução 6: Recriar rede Docker

```bash
cd /var/www/mozloja.online/api-site-manager

# Parar tudo
docker compose down

# Remover rede
docker network rm api-site-manager_txuna-network

# Recriar tudo
docker compose up -d
```

## 🔍 Diagnóstico Completo

Execute este script para diagnosticar:

```bash
cd /var/www/mozloja.online/api-site-manager
chmod +x scripts/test-db-connection.sh
./scripts/test-db-connection.sh
```

## 📋 Checklist

- [ ] MySQL container está rodando: `docker compose ps mysql`
- [ ] MySQL está na rede: `docker network inspect api-site-manager_txuna-network`
- [ ] API está na rede: `docker network inspect api-site-manager_txuna-network`
- [ ] DNS funciona: `docker compose exec api ping -c 1 mysql`
- [ ] Variáveis DB_* estão no .env
- [ ] MySQL inicializou completamente (aguardar 30-60s após start)

## 🚀 Solução Rápida (Reset Completo)

```bash
cd /var/www/mozloja.online/api-site-manager

# 1. Parar tudo
docker compose down

# 2. Verificar .env
cat .env | grep DB_

# 3. Remover rede antiga (se existir)
docker network rm api-site-manager_txuna-network 2>/dev/null || true

# 4. Iniciar MySQL primeiro
docker compose up -d mysql

# 5. Aguardar (IMPORTANTE!)
echo "Aguardando MySQL inicializar..."
sleep 45

# 6. Verificar MySQL
docker compose exec mysql mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT 1" 2>&1

# 7. Iniciar API
docker compose up -d api

# 8. Verificar
docker compose ps
docker compose logs api --tail=20
```

## ⚠️ Problema Comum: MySQL ainda inicializando

O MySQL pode levar 30-60 segundos para inicializar completamente. A API tenta conectar antes do MySQL estar pronto.

**Solução**: Aguardar antes de iniciar a API, ou usar `depends_on` com healthcheck (já configurado).

## 📝 Verificar Variáveis de Ambiente

```bash
# Ver variáveis do container API
docker compose exec api env | grep DB_

# Deve mostrar:
# DB_HOST=mysql
# DB_PORT=3306
# DB_USER=txuna_user
# DB_PASSWORD=...
# DB_NAME=txuna_sites
```

Se alguma variável estiver faltando, edite o `.env` e reinicie.

---

**Execute o diagnóstico primeiro**: `./scripts/test-db-connection.sh`

