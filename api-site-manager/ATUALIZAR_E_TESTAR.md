# 🔄 Atualizar e Testar API - Guia Completo

## ⚠️ IMPORTANTE: Você precisa atualizar o código e reconstruir o container!

O código no servidor está desatualizado. Siga estes passos:

---

## 📋 Passo 1: Atualizar Código e Reconstruir

```bash
cd /var/www/mozloja.online/api-site-manager

# 1. Atualizar código do repositório
git pull origin main

# 2. RECONSTRUIR o container (CRÍTICO - não apenas restart!)
docker compose build --no-cache api

# 3. Parar container
docker compose stop api

# 4. Iniciar container
docker compose up -d api

# 5. Aguardar inicialização
sleep 5

# 6. Verificar se está rodando
docker compose ps
```

---

## 🧹 Passo 2: Limpar Diretórios Antigos

```bash
# Ver quais diretórios existem
ls -la /var/www/ | grep -E "test|teste|meusite"

# Remover diretórios de teste (CUIDADO: verifique antes!)
rm -rf /var/www/test
rm -rf /var/www/teste1
rm -rf /var/www/teste2
rm -rf /var/www/meusite
rm -rf /var/www/testefinal

# Verificar se foram removidos
ls -la /var/www/ | grep -E "test|teste|meusite"
```

---

## 🧪 Passo 3: Verificar Detecção de Container

```bash
# Verificar se o arquivo /.dockerenv existe
docker compose exec api ls -la /.dockerenv

# Deve mostrar: -rwxr-xr-x 1 root root 0 ...
```

---

## ✅ Passo 4: Testar Criação de Site

```bash
# Usar um subdomínio NOVO que não existe
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "subdomain": "novosite123",
    "type": "static",
    "storageLimit": 500
  }'
```

**Resultado esperado:**
- ✅ `{"success":true,"data":{...}}`
- ⚠️ NÃO deve aparecer erro de "nginx: not found"

---

## 📊 Passo 5: Verificar Logs

```bash
# Ver logs recentes
docker compose logs api --tail=30

# Procurar por mensagens de "Skipping" (indica que detectou container)
docker compose logs api | grep -i "skipping\|docker\|nginx" | tail -10
```

**Você deve ver:**
```
Skipping Nginx test in container (Nginx runs on host)
Nginx reload skipped in container. Please reload manually
```

**NÃO deve ver:**
```
nginx: not found
```

---

## 🔧 Passo 6: Recarregar Nginx Manualmente

Após criar o site com sucesso:

```bash
# Testar configuração Nginx
nginx -t

# Recarregar Nginx
systemctl reload nginx

# Verificar se configuração foi criada
ls -la /etc/nginx/sites-enabled/novosite123

# Verificar diretório criado
ls -la /var/www/novosite123
```

---

## 🐛 Troubleshooting

### Erro: "Directory already exists"

```bash
# Remover diretório
rm -rf /var/www/SUBDOMAIN

# Verificar no banco também
docker compose exec mysql mysql -u txuna_user -p$DB_PASSWORD txuna_sites -e "SELECT subdomain FROM sites;"
```

### Erro: "nginx: not found" ainda aparece

```bash
# Verificar se código foi atualizado
docker compose exec api cat /app/src/services/subdomain.service.js | grep -A 5 "isDockerContainer"

# Deve mostrar:
# const isDockerContainer = existsSync('/.dockerenv');
# ...
# if (isDockerContainer) {
#   logger.info('Skipping Nginx test in container...
```

Se não mostrar isso, o código não foi atualizado. Execute novamente:
```bash
git pull origin main
docker compose build --no-cache api
docker compose restart api
```

### Container não inicia

```bash
# Ver logs de erro
docker compose logs api

# Verificar variáveis de ambiente
docker compose exec api env | grep -E "NGINX|BASE_DIR|MAIN_DOMAIN"
```

---

## 📝 Checklist Completo

Antes de testar:

- [ ] Código atualizado: `git pull origin main`
- [ ] Container reconstruído: `docker compose build --no-cache api`
- [ ] Container reiniciado: `docker compose restart api`
- [ ] Diretórios antigos removidos
- [ ] Subdomínio único (não usado antes)
- [ ] `/.dockerenv` existe no container

Após criar site:

- [ ] Site criado com sucesso (sem erro "nginx: not found")
- [ ] Logs mostram "Skipping Nginx test"
- [ ] Nginx recarregado: `systemctl reload nginx`
- [ ] Configuração criada: `ls /etc/nginx/sites-enabled/SUBDOMAIN`
- [ ] Diretório criado: `ls /var/www/SUBDOMAIN`

---

## 🚀 Script Automático

Use o script criado:

```bash
cd /var/www/mozloja.online/api-site-manager
chmod +x atualizar-api.sh
bash atualizar-api.sh
```

Depois limpe os diretórios e teste!

---

**Execute TODOS os passos acima na ordem!** 🔥

