# Solução Rápida - Problemas Comuns

## 🔴 Problema: "Directory already exists"

### Solução 1: Limpar diretórios existentes

```bash
# Ver quais diretórios existem
ls -la /var/www/ | grep -E "test|teste"

# Remover diretórios de teste (CUIDADO: verifique antes!)
rm -rf /var/www/test
rm -rf /var/www/teste1

# Verificar se foram removidos
ls -la /var/www/ | grep -E "test|teste"
```

### Solução 2: Usar subdomínio diferente

```bash
# Usar um subdomínio que não existe
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "subdomain": "novosite123",
    "type": "static"
  }'
```

### Solução 3: Verificar e limpar do banco também

```bash
# Conectar ao MySQL
docker compose exec mysql mysql -u txuna_user -p$DB_PASSWORD txuna_sites

# Ver sites existentes
SELECT id, subdomain, status FROM sites;

# Deletar site do banco (se necessário)
DELETE FROM sites WHERE subdomain='test';
DELETE FROM sites WHERE subdomain='teste1';

EXIT;
```

---

## 🔴 Problema: "Nginx configuration test failed: nginx: not found"

### Solução: Atualizar código e reconstruir

```bash
cd /var/www/mozloja.online/api-site-manager

# 1. Atualizar código
git pull origin main

# 2. Reconstruir container
docker compose build --no-cache api

# 3. Reiniciar
docker compose restart api

# 4. Verificar logs
docker compose logs api --tail=20
```

Agora o código detecta que está em container e pula os comandos Nginx.

---

## ✅ Teste Completo (Passo a Passo)

### 1. Limpar diretórios antigos

```bash
# Remover diretórios de teste
rm -rf /var/www/test /var/www/teste1

# Limpar do banco (se necessário)
docker compose exec mysql mysql -u txuna_user -p$DB_PASSWORD txuna_sites -e "DELETE FROM sites WHERE subdomain IN ('test', 'teste1');"
```

### 2. Atualizar e reconstruir API

```bash
cd /var/www/mozloja.online/api-site-manager
git pull origin main
docker compose build --no-cache api
docker compose restart api
sleep 5
```

### 3. Criar site

```bash
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "subdomain": "meusite",
    "type": "static",
    "storageLimit": 500
  }'
```

**Resultado esperado:**
- ✅ Site criado
- ⚠️ Aviso sobre reload manual do Nginx

### 4. Recarregar Nginx manualmente

```bash
# Testar configuração
nginx -t

# Recarregar
systemctl reload nginx
```

### 5. Verificar

```bash
# Ver se configuração foi criada
ls -la /etc/nginx/sites-enabled/meusite

# Ver diretório
ls -la /var/www/meusite

# Testar acesso (se DNS configurado)
curl -I http://meusite.mozloja.online
```

---

## 🔧 Comandos Úteis

### Limpar tudo e recomeçar

```bash
cd /var/www/mozloja.online/api-site-manager

# Parar containers
docker compose down

# Limpar diretórios de teste
rm -rf /var/www/test* /var/www/teste*

# Limpar banco (CUIDADO: remove TODOS os sites!)
docker compose exec mysql mysql -u txuna_user -p$DB_PASSWORD txuna_sites -e "DELETE FROM sites;"

# Limpar configurações Nginx de teste
rm -f /etc/nginx/sites-available/test*
rm -f /etc/nginx/sites-enabled/test*

# Reiniciar
docker compose up -d
```

### Verificar status completo

```bash
# Containers
docker compose ps

# Diretórios
ls -la /var/www/

# Nginx configs
ls -la /etc/nginx/sites-enabled/

# Sites no banco
docker compose exec mysql mysql -u txuna_user -p$DB_PASSWORD txuna_sites -e "SELECT subdomain, type, status FROM sites;"
```

---

## 📝 Checklist Rápido

Antes de criar site:

- [ ] Código atualizado: `git pull origin main`
- [ ] Container reconstruído: `docker compose build --no-cache api`
- [ ] Container reiniciado: `docker compose restart api`
- [ ] Diretórios antigos removidos (se necessário)
- [ ] Subdomínio único (não usado antes)

Após criar site:

- [ ] Nginx recarregado: `systemctl reload nginx`
- [ ] Configuração criada: `ls /etc/nginx/sites-enabled/SUBDOMAIN`
- [ ] Diretório criado: `ls /var/www/SUBDOMAIN`
- [ ] Site no banco: verificar com SELECT

---

**Execute os passos acima e tente criar o site novamente!** 🚀

