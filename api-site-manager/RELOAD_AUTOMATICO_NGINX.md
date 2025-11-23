# 🔄 Reload Automático do Nginx

## ✅ Implementação

O sistema agora recarrega o Nginx **automaticamente** após criar sites, mesmo quando a API está rodando em container Docker.

---

## 🔧 Como Funciona

### 1. Script Mapeado

O script `reload-nginx.sh` é mapeado para dentro do container em `/usr/local/bin/reload-nginx.sh`:

```yaml
volumes:
  - ./scripts/reload-nginx.sh:/usr/local/bin/reload-nginx.sh:ro
```

### 2. Execução Automática

Quando um site é criado:

1. ✅ Configuração Nginx é criada
2. ✅ **Nginx é recarregado automaticamente** (via script)
3. ✅ SSL é instalado (se habilitado)
4. ✅ **Nginx é recarregado novamente** (após SSL)

---

## 📋 Fluxo Completo

```
1. Criar diretório: /var/www/subdomain
2. Criar index.html padrão
3. Criar configuração Nginx
4. 🔄 RECARREGAR NGINX (automático)
5. Instalar SSL
6. Atualizar configuração Nginx (HTTPS)
7. 🔄 RECARREGAR NGINX (automático)
8. Registrar no banco
9. Criar usuário FTP
```

---

## 🛠️ Configuração no Servidor

### 1. Garantir que o script é executável

```bash
cd /var/www/mozloja.online/api-site-manager
chmod +x scripts/reload-nginx.sh
```

### 2. Verificar mapeamento no docker-compose.yml

O volume já está configurado:
```yaml
- ./scripts/reload-nginx.sh:/usr/local/bin/reload-nginx.sh:ro
```

### 3. Atualizar código e reconstruir

```bash
# Atualizar código
git pull origin main

# Reconstruir container
docker compose build --no-cache api

# Reiniciar
docker compose restart api
```

---

## 🧪 Teste

### Criar um site:

```bash
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "subdomain": "teste-reload",
    "type": "static"
  }'
```

### Verificar logs:

```bash
docker compose logs api | grep -i "nginx reloaded"
```

**Deve mostrar:**
```
Nginx reloaded successfully via script
Nginx reloaded with SSL configuration via script
```

### Verificar se Nginx foi recarregado:

```bash
# Ver status do Nginx
systemctl status nginx

# Ver última vez que foi recarregado
journalctl -u nginx | tail -5
```

---

## 🐛 Troubleshooting

### Erro: "Permission denied" ao executar script

**Solução:**
```bash
# Tornar script executável
chmod +x scripts/reload-nginx.sh

# Verificar permissões
ls -la scripts/reload-nginx.sh
```

### Script não encontrado no container

**Verificar:**
```bash
# Ver se script existe no container
docker compose exec api ls -la /usr/local/bin/reload-nginx.sh

# Se não existir, verificar mapeamento no docker-compose.yml
cat docker-compose.yml | grep reload-nginx
```

### Nginx não recarrega automaticamente

**Verificar logs:**
```bash
docker compose logs api | grep -i "nginx reload"
```

**Se mostrar aviso:**
```
Failed to reload Nginx automatically, manual reload required
```

**Causas possíveis:**
- Script não é executável
- Nginx não está instalado no host
- Permissões insuficientes

**Solução manual:**
```bash
# Recarregar manualmente
systemctl reload nginx
```

### Fallback: Execução Direta

Se o script não funcionar, o código tenta executar `systemctl reload nginx` diretamente. Isso pode funcionar se:
- Container tem privilégios especiais
- Nginx está instalado no container (não recomendado)

---

## 📝 Comportamento

### Em Container Docker:
1. Tenta executar `/usr/local/bin/reload-nginx.sh`
2. Se não existir, tenta `systemctl reload nginx` diretamente
3. Se falhar, apenas avisa (não interrompe criação do site)

### No Host (sem Docker):
- Executa `systemctl reload nginx` diretamente
- Se falhar, lança erro (interrompe criação)

---

## ✅ Checklist

Após atualizar código:

- [ ] Script é executável: `chmod +x scripts/reload-nginx.sh`
- [ ] Código atualizado: `git pull origin main`
- [ ] Container reconstruído: `docker compose build --no-cache api`
- [ ] Container reiniciado: `docker compose restart api`
- [ ] Script existe no container: `docker compose exec api ls /usr/local/bin/reload-nginx.sh`
- [ ] Teste de criação funciona
- [ ] Logs mostram "Nginx reloaded successfully via script"

---

**Agora o Nginx é recarregado automaticamente após criar sites!** 🎉

