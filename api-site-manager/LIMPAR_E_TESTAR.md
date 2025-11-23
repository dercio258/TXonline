# 🧹 Limpar Diretórios e Testar

## 📍 Entendendo a Estrutura

No `docker-compose.yml`, há um mapeamento de volume:
```yaml
- ./sites:/var/www
```

Isso significa:
- **Dentro do container**: `/var/www/subdomain`
- **No host**: `/var/www/mozloja.online/api-site-manager/sites/subdomain`

Os sites estão sendo criados corretamente! ✅

---

## 🧹 Limpar Diretórios Antigos

### Opção 1: Limpar diretórios específicos

```bash
cd /var/www/mozloja.online/api-site-manager

# Ver quais diretórios existem
ls -la sites/

# Remover diretórios de teste (CUIDADO: verifique antes!)
rm -rf sites/test
rm -rf sites/teste1
rm -rf sites/teste2
rm -rf sites/meusite
rm -rf sites/testefinal
rm -rf sites/meuprimeirosite
rm -rf sites/newsite

# Verificar se foram removidos
ls -la sites/
```

### Opção 2: Limpar tudo e recomeçar

```bash
cd /var/www/mozloja.online/api-site-manager

# Fazer backup (opcional)
tar -czf sites-backup-$(date +%Y%m%d).tar.gz sites/

# Limpar todos os diretórios
rm -rf sites/*

# Limpar do banco também (CUIDADO: remove TODOS os sites!)
docker compose exec mysql mysql -u txuna_user -p$DB_PASSWORD txuna_sites -e "DELETE FROM sites;"

# Limpar configurações Nginx de teste
rm -f /etc/nginx/sites-available/test*
rm -f /etc/nginx/sites-enabled/test*
rm -f /etc/nginx/sites-available/teste*
rm -f /etc/nginx/sites-enabled/teste*
rm -f /etc/nginx/sites-available/meusite
rm -f /etc/nginx/sites-enabled/meusite
```

---

## 🔄 Atualizar Código e Reconstruir

**IMPORTANTE**: Você precisa atualizar o código e reconstruir o container!

```bash
cd /var/www/mozloja.online/api-site-manager

# 1. Atualizar código
git pull origin main

# 2. RECONSTRUIR (não apenas restart!)
docker compose build --no-cache api

# 3. Reiniciar
docker compose stop api
docker compose up -d api

# 4. Aguardar
sleep 5

# 5. Verificar logs
docker compose logs api --tail=20
```

---

## ✅ Testar Criação de Site

```bash
# Usar um subdomínio NOVO
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
```json
{
  "success": true,
  "data": {
    "id": "...",
    "subdomain": "novosite123",
    ...
  }
}
```

**NÃO deve aparecer:**
- ❌ `"nginx: not found"`
- ❌ `"Directory already exists"` (se você limpou)

---

## 📊 Verificar Resultado

```bash
# Ver diretório criado
ls -la sites/novosite123

# Ver configuração Nginx
ls -la /etc/nginx/sites-enabled/novosite123

# Ver logs da API
docker compose logs api | grep -i "novosite123" | tail -5

# Verificar se detectou container
docker compose logs api | grep -i "skipping" | tail -3
```

Você deve ver:
```
Skipping Nginx test in container (Nginx runs on host)
Nginx reload skipped in container. Please reload manually
```

---

## 🔧 Recarregar Nginx

Após criar o site com sucesso:

```bash
# Testar configuração
nginx -t

# Recarregar
systemctl reload nginx

# Verificar se está funcionando
curl -I http://novosite123.mozloja.online
```

---

## 🐛 Troubleshooting

### Erro: "Directory already exists"

```bash
# Verificar se existe
ls -la sites/SUBDOMAIN

# Remover
rm -rf sites/SUBDOMAIN

# Verificar no banco
docker compose exec mysql mysql -u txuna_user -p$DB_PASSWORD txuna_sites -e "SELECT subdomain FROM sites WHERE subdomain='SUBDOMAIN';"

# Remover do banco se necessário
docker compose exec mysql mysql -u txuna_user -p$DB_PASSWORD txuna_sites -e "DELETE FROM sites WHERE subdomain='SUBDOMAIN';"
```

### Erro: "nginx: not found" ainda aparece

O código não foi atualizado. Execute:

```bash
git pull origin main
docker compose build --no-cache api
docker compose restart api
```

### Verificar código dentro do container

```bash
# Ver se o código foi atualizado
docker compose exec api cat /app/src/services/subdomain.service.js | grep -A 3 "isDockerContainer"

# Deve mostrar:
# const isDockerContainer = existsSync('/.dockerenv');
# ...
# if (isDockerContainer) {
```

---

## 📝 Checklist Completo

Antes de testar:

- [ ] Código atualizado: `git pull origin main`
- [ ] Container reconstruído: `docker compose build --no-cache api`
- [ ] Container reiniciado: `docker compose restart api`
- [ ] Diretórios antigos removidos de `sites/`
- [ ] Configurações Nginx antigas removidas
- [ ] Subdomínio único (não usado antes)

Após criar site:

- [ ] Site criado com sucesso (sem erro "nginx: not found")
- [ ] Logs mostram "Skipping Nginx test"
- [ ] Diretório criado: `ls sites/SUBDOMAIN`
- [ ] Configuração Nginx criada: `ls /etc/nginx/sites-enabled/SUBDOMAIN`
- [ ] Nginx recarregado: `systemctl reload nginx`

---

**Execute os passos acima e teste novamente!** 🚀

