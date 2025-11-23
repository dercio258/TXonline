# Notas: Nginx em Container vs Host

## 🔍 Situação Atual

- **Nginx**: Rodando no **host** (servidor)
- **API**: Rodando em **container Docker**
- **Problema**: Container não pode executar comandos Nginx diretamente

## ✅ Solução Implementada

O código foi ajustado para:
1. **Detectar** se está rodando em container Docker
2. **Pular** validação `nginx -t` quando em container
3. **Avisar** que reload manual é necessário
4. **Criar** configurações normalmente (via volumes mapeados)

## 📋 O que Acontece Agora

### Ao Criar Subdomínio:

1. ✅ Configuração Nginx é **criada** (via volume mapeado)
2. ⚠️ Validação `nginx -t` é **pulada** (Nginx não está no container)
3. ⚠️ Reload do Nginx é **pulado** (precisa ser manual)

### Após Criar Subdomínio:

**Execute manualmente no host:**

```bash
# Testar configuração
nginx -t

# Recarregar Nginx
systemctl reload nginx
```

## 🔧 Alternativas Futuras

### Opção 1: Script no Host (Recomendado)

Criar um script que a API pode chamar via volume:

```bash
# No host, criar: /usr/local/bin/reload-nginx-api.sh
#!/bin/bash
nginx -t && systemctl reload nginx

# Chamar do container:
# sh /usr/local/bin/reload-nginx-api.sh
```

### Opção 2: Webhook/API no Host

Criar um endpoint simples no host que recarrega Nginx:

```bash
# API chama: curl http://host:8080/reload-nginx
```

### Opção 3: Cron Job

Verificar mudanças em `/etc/nginx/sites-available` e recarregar automaticamente.

## 📝 Comportamento Atual

### Criar Site:

```bash
curl -X POST http://localhost:3000/api/sites \
  -H "X-API-Key: $API_KEY" \
  -d '{"subdomain": "teste", "type": "static"}'
```

**Resultado:**
- ✅ Diretório criado
- ✅ Configuração Nginx criada em `/etc/nginx/sites-available/teste`
- ✅ Symlink criado em `/etc/nginx/sites-enabled/teste`
- ⚠️ **Nginx NÃO foi recarregado automaticamente**

**Ação necessária:**
```bash
nginx -t && systemctl reload nginx
```

## 🚀 Script de Reload Automático

Crie um script no host para recarregar após criação:

```bash
# /usr/local/bin/reload-nginx-api.sh
#!/bin/bash
nginx -t && systemctl reload nginx && echo "Nginx reloaded"
```

Torne executável:
```bash
chmod +x /usr/local/bin/reload-nginx-api.sh
```

No código da API, após criar subdomínio, chamar:
```javascript
await execAsync('sh /usr/local/bin/reload-nginx-api.sh');
```

## ✅ Status

- ✅ Volumes mapeados corretamente
- ✅ Configurações são criadas
- ⚠️ Reload precisa ser manual (por enquanto)
- 📝 Documentado para implementação futura

---

**Nota**: Por enquanto, após criar sites, execute `systemctl reload nginx` manualmente no host.

