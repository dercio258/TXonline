# 🔄 Migração de Diretório de Sites

## 📋 O que foi alterado

O diretório de sites foi alterado de `./sites` para `/var/www` diretamente no host.

### Antes:
- **Container**: `/var/www/subdomain`
- **Host**: `/var/www/mozloja.online/api-site-manager/sites/subdomain`

### Depois:
- **Container**: `/var/www/subdomain`
- **Host**: `/var/www/subdomain` ✅

Isso é o padrão esperado pelo Nginx e facilita o acesso aos sites.

---

## 🔄 Como migrar sites existentes

### 1. Parar containers

```bash
cd /var/www/mozloja.online/api-site-manager
docker compose down
```

### 2. Mover sites existentes

```bash
# Verificar sites existentes
ls -la sites/

# Mover sites para /var/www
mv sites/* /var/www/

# Verificar se foram movidos
ls -la /var/www/ | grep -E "meuprimeirosite|meusite|Neonlife|newsite|test|teste"

# Remover diretório sites (agora vazio)
rmdir sites/
```

### 3. Atualizar código e reconstruir

```bash
# Atualizar código
git pull origin main

# Reconstruir container
docker compose build --no-cache api

# Iniciar containers
docker compose up -d
```

### 4. Verificar configurações Nginx

As configurações Nginx já apontam para `/var/www/subdomain`, então não precisam ser alteradas. Mas verifique:

```bash
# Ver uma configuração de exemplo
cat /etc/nginx/sites-available/meusite | grep root

# Deve mostrar: root /var/www/meusite;
```

Se mostrar `root /var/www/mozloja.online/api-site-manager/sites/meusite;`, você precisa atualizar as configurações:

```bash
# Atualizar todas as configurações
for file in /etc/nginx/sites-available/*; do
  if [ -f "$file" ]; then
    sed -i 's|/var/www/mozloja.online/api-site-manager/sites/|/var/www/|g' "$file"
  fi
done

# Testar configuração
nginx -t

# Recarregar
systemctl reload nginx
```

---

## ✅ Verificar se funcionou

### 1. Criar um novo site de teste

```bash
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "subdomain": "teste-migracao",
    "type": "static",
    "storageLimit": 500
  }'
```

### 2. Verificar diretório

```bash
# Deve estar em /var/www (não em sites/)
ls -la /var/www/teste-migracao
```

### 3. Verificar configuração Nginx

```bash
cat /etc/nginx/sites-available/teste-migracao | grep root

# Deve mostrar: root /var/www/teste-migracao;
```

---

## 🐛 Troubleshooting

### Erro: "Permission denied" ao criar diretório

```bash
# Verificar permissões
ls -ld /var/www

# Ajustar permissões se necessário
chmod 755 /var/www
chown www-data:www-data /var/www
```

### Sites antigos não aparecem

Verifique se foram movidos corretamente:

```bash
# Verificar se existem em /var/www
ls -la /var/www/ | grep -E "meuprimeirosite|meusite"

# Se não existirem, mover novamente
mv sites/* /var/www/ 2>/dev/null || echo "Diretório sites/ não existe ou está vazio"
```

### Nginx não encontra os arquivos

Verifique se as configurações Nginx apontam para o caminho correto:

```bash
# Ver configuração
cat /etc/nginx/sites-available/SUBDOMAIN | grep root

# Se estiver errado, corrigir manualmente ou usar o script acima
```

---

## 📝 Checklist de Migração

- [ ] Containers parados: `docker compose down`
- [ ] Sites movidos: `mv sites/* /var/www/`
- [ ] Código atualizado: `git pull origin main`
- [ ] Container reconstruído: `docker compose build --no-cache api`
- [ ] Containers iniciados: `docker compose up -d`
- [ ] Configurações Nginx verificadas/corrigidas
- [ ] Nginx recarregado: `systemctl reload nginx`
- [ ] Teste de criação de site funcionando
- [ ] Diretório criado em `/var/www` (não em `sites/`)

---

**Após a migração, os novos sites serão criados diretamente em `/var/www`!** ✅

