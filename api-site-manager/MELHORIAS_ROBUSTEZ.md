# 🔧 Melhorias de Robustez Implementadas

## ✅ Correções Aplicadas

### 1. **Permissões Automáticas (chown)**
- ✅ Diretórios criados com permissões corretas (`www-data:www-data` ou `nginx:nginx`)
- ✅ Permissões 755 para diretórios
- ✅ Permissões 644 para arquivos
- ✅ Fallback para diferentes sistemas (Ubuntu/Debian/CentOS)

### 2. **Configuração Nginx Anti-403**
- ✅ Adicionado `allow all` nos blocos location
- ✅ Melhorado `try_files` para incluir `/index.html`
- ✅ Adicionado `autoindex off` explicitamente
- ✅ Bloco para negar arquivos ocultos (`.htaccess`, etc.)

### 3. **Reload Automático do Nginx (Múltiplos Métodos)**
- ✅ **Método 1**: `nsenter` (acessa namespace do host)
- ✅ **Método 2**: Script mapeado (`/usr/local/bin/reload-nginx.sh`)
- ✅ **Método 3**: Execução direta (fallback)
- ✅ Tenta todos os métodos até um funcionar
- ✅ Não interrompe criação do site se falhar (apenas avisa)

### 4. **Script de Reload Melhorado**
- ✅ Silencioso (não imprime mensagens desnecessárias)
- ✅ Fallback para `kill -HUP` se `systemctl` falhar
- ✅ Retorna códigos de saída corretos

---

## 📋 Fluxo Completo de Criação

```
1. Validar subdomínio
2. Criar diretório: /var/www/subdomain
3. 🔒 Definir permissões: chown www-data:www-data, chmod 755
4. Criar index.html padrão
5. 🔒 Definir permissões do index.html: chown, chmod 644
6. Criar configuração Nginx (com proteção anti-403)
7. 🔄 Recarregar Nginx (tenta múltiplos métodos)
8. Instalar SSL
9. Atualizar configuração Nginx (HTTPS)
10. 🔄 Recarregar Nginx novamente
11. Registrar no banco
12. Criar usuário FTP
```

---

## 🧪 Teste Completo

### 1. Criar site

```bash
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "subdomain": "teste-robusto",
    "type": "static"
  }'
```

### 2. Verificar permissões

```bash
# Ver permissões do diretório
ls -ld /var/www/teste-robusto

# Deve mostrar: drwxr-xr-x www-data www-data ou nginx nginx

# Ver permissões do index.html
ls -l /var/www/teste-robusto/index.html

# Deve mostrar: -rw-r--r-- www-data www-data
```

### 3. Verificar logs do Nginx

```bash
# Ver logs da API
docker compose logs api | grep -i "nginx reloaded\|permissions"

# Deve mostrar:
# Permissions set for site directory
# Nginx reloaded successfully via nsenter (ou script/direct)
```

### 4. Testar acesso

```bash
# Testar HTTP
curl -I http://teste-robusto.mozloja.online

# Deve retornar: HTTP/1.1 200 OK (não 403!)

# Testar HTTPS
curl -I https://teste-robusto.mozloja.online

# Deve retornar: HTTP/2 200
```

---

## 🔧 Configuração Nginx Gerada

### Características Anti-403:

```nginx
location / {
    try_files $uri $uri/ /index.html /index.php?$args;
    allow all;  # ← Permite acesso
}

# Negar apenas arquivos ocultos
location ~ /\. {
    deny all;
}
```

---

## 🐛 Troubleshooting

### Erro 403 ainda aparece

**Verificar permissões:**
```bash
# Verificar dono do diretório
ls -ld /var/www/SUBDOMAIN

# Se não for www-data ou nginx, corrigir:
chown -R www-data:www-data /var/www/SUBDOMAIN
chmod -R 755 /var/www/SUBDOMAIN
```

**Verificar configuração Nginx:**
```bash
# Ver configuração gerada
cat /etc/nginx/sites-available/SUBDOMAIN

# Verificar se tem "allow all" no location /
```

### Nginx não recarrega automaticamente

**Verificar logs:**
```bash
docker compose logs api | grep -i "nginx reload"
```

**Recarregar manualmente:**
```bash
nginx -t && systemctl reload nginx
```

### Permissões não são definidas

**Verificar se usuário existe:**
```bash
# Verificar usuário www-data
id www-data

# Se não existir, verificar nginx
id nginx

# Ou usar UID/GID diretamente
chown -R 33:33 /var/www/SUBDOMAIN
```

---

## 📝 Checklist de Verificação

Após criar site:

- [ ] Diretório criado: `ls /var/www/SUBDOMAIN`
- [ ] Permissões corretas: `ls -ld /var/www/SUBDOMAIN` (www-data ou nginx)
- [ ] index.html existe: `ls -l /var/www/SUBDOMAIN/index.html`
- [ ] Permissões do index.html: `-rw-r--r--`
- [ ] Configuração Nginx criada: `ls /etc/nginx/sites-enabled/SUBDOMAIN`
- [ ] Nginx recarregado: verificar logs
- [ ] Site acessível: `curl http://SUBDOMAIN.mozloja.online` (200 OK, não 403)
- [ ] SSL instalado: `certbot certificates | grep SUBDOMAIN`

---

**Sistema agora é mais robusto e confiável!** ✅

