# 🔍 Verificar e Corrigir Problemas

## 🔴 Problemas Identificados

1. Permissões não aplicadas (root:root)
2. index.html não criado
3. Nginx não recarregado
4. Site não responde

---

## ✅ Solução Imediata

### 1. Verificar logs completos da API

```bash
cd /var/www/mozloja.online/api-site-manager

# Ver logs completos da criação do site
docker compose logs api | grep -A 10 -B 10 "testerobusto"

# Ver todos os logs recentes
docker compose logs api --tail=100
```

### 2. Corrigir site existente manualmente

```bash
# Corrigir permissões
chown -R www-data:www-data /var/www/testerobusto
chmod -R 755 /var/www/testerobusto

# Criar index.html manualmente
cat > /var/www/testerobusto/index.html << 'EOF'
<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Testerobusto — Bem-vindo</title>
  <style>
    :root{--laranja:#ff7a00;--azul:#0066cc;font-family:system-ui,-apple-system,Segoe UI,Roboto,"Helvetica Neue",Arial;}
    body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#fff;color:#222}
    .card{padding:22px 28px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.08);max-width:520px;text-align:left}
    h1{margin:0 0 8px;font-size:20px;color:var(--laranja)}
    p{margin:0 0 14px;color:#444}
    .cta{display:inline-block;padding:10px 14px;border-radius:8px;background:var(--azul);color:#fff;text-decoration:none;font-weight:600}
    small{display:block;margin-top:10px;color:#666}
  </style>
</head>
<body>
  <div class="card">
    <h1>Seja bem-vindo, Testerobusto!</h1>
    <p>Esta página foi criada automaticamente pelo <strong>Txuna Site</strong> para apresentar e configurar seu site de forma rápida e profissional.</p>
    <a class="cta" href="https://h.panel.txunasite.com" target="_blank" rel="noopener">Clique aqui para configurar</a>
    <small>As cores principais são laranja e azul — personalize o texto e substitua <code>Testerobusto</code>.</small>
  </div>
</body>
</html>
EOF

# Definir permissões do index.html
chown www-data:www-data /var/www/testerobusto/index.html
chmod 644 /var/www/testerobusto/index.html

# Verificar
ls -la /var/www/testerobusto/
```

### 3. Recarregar Nginx

```bash
# Testar configuração
nginx -t

# Recarregar
systemctl reload nginx

# Verificar status
systemctl status nginx
```

### 4. Testar acesso

```bash
# Testar HTTP
curl -I http://testerobusto.mozloja.online

# Deve retornar: HTTP/1.1 200 OK
```

---

## 🔄 Atualizar Código e Testar Novamente

### 1. Atualizar código

```bash
cd /var/www/mozloja.online/api-site-manager

# Atualizar
git pull origin main

# Reconstruir container
docker compose build --no-cache api

# Reiniciar
docker compose restart api

# Aguardar
sleep 5
```

### 2. Limpar site de teste e criar novo

```bash
# Remover site de teste
rm -rf /var/www/testerobusto

# Remover configuração Nginx
rm -f /etc/nginx/sites-available/testerobusto
rm -f /etc/nginx/sites-enabled/testerobusto

# Remover do banco (opcional)
docker compose exec mysql mysql -u txuna_user -p$DB_PASSWORD txuna_sites -e "DELETE FROM sites WHERE subdomain='testerobusto';"

# Criar novo site
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "subdomain": "teste-novo",
    "type": "static"
  }'
```

### 3. Verificar logs detalhados

```bash
# Ver logs em tempo real
docker compose logs api -f

# Em outro terminal, criar o site e observar os logs
```

### 4. Verificar o que foi criado

```bash
# Ver permissões
ls -ld /var/www/teste-novo
ls -l /var/www/teste-novo/index.html

# Ver logs da API
docker compose logs api | grep -i "teste-novo" | tail -20

# Verificar se Nginx foi recarregado
docker compose logs api | grep -i "nginx reloaded"
```

---

## 🐛 Troubleshooting

### index.html não é criado

**Verificar logs:**
```bash
docker compose logs api | grep -i "index.html\|Failed to create"
```

**Possíveis causas:**
- Erro de permissão ao escrever arquivo
- Diretório não existe
- Erro no código

**Solução:**
- Verificar se diretório existe: `ls -ld /var/www/SUBDOMAIN`
- Verificar permissões do diretório pai: `ls -ld /var/www`
- Criar manualmente se necessário

### Permissões não são definidas

**Verificar logs:**
```bash
docker compose logs api | grep -i "permissions\|chown"
```

**Possíveis causas:**
- Container não tem privilégios para chown
- Usuário www-data/nginx não existe no container

**Solução:**
- Executar chown manualmente no host
- Ou adicionar privilégios ao container (não recomendado)

### Nginx não recarrega

**Verificar logs:**
```bash
docker compose logs api | grep -i "nginx reload\|reload method failed"
```

**Possíveis causas:**
- nsenter não funciona
- Script não existe
- Container não tem acesso ao host

**Solução:**
- Recarregar manualmente: `systemctl reload nginx`
- Verificar se script existe: `docker compose exec api ls /usr/local/bin/reload-nginx.sh`

---

## 📝 Checklist de Verificação

Após criar site:

- [ ] Diretório criado: `ls /var/www/SUBDOMAIN`
- [ ] Permissões corretas: `ls -ld /var/www/SUBDOMAIN` (www-data ou nginx)
- [ ] index.html existe: `ls -l /var/www/SUBDOMAIN/index.html`
- [ ] Permissões do index.html: `-rw-r--r--`
- [ ] Configuração Nginx criada: `ls /etc/nginx/sites-enabled/SUBDOMAIN`
- [ ] Nginx recarregado: verificar logs ou `systemctl status nginx`
- [ ] Site acessível: `curl http://SUBDOMAIN.mozloja.online` (200 OK)

---

**Execute os passos acima para corrigir o site existente e testar novamente!** ✅

