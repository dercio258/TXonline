# Resumo - Configuração para mozloja.online

## ✅ Configurações Atualizadas

### Domínio
- **Domínio Principal**: `mozloja.online`
- **API Domain**: `api.mozloja.online`
- **Path da API**: `/var/www/mozloja.online`
- **SSL**: Automático com Let's Encrypt

### Funcionalidades Implementadas

1. **SSL Automático** ✅
   - Instalado automaticamente ao criar subdomínios
   - Service: `SSLService`
   - Endpoints: `/api/ssl/install`, `/api/ssl/renew/:domain`, `/api/ssl/info/:domain`

2. **Criação Automática de Sites** ✅
   - WordPress: Cria banco, container, instala WordPress, SSL
   - Estático: Cria diretório, subdomínio, SSL, FTP

3. **Comandos Externos** ✅
   - Documentação completa em `COMANDOS_EXTERNOS.md`
   - Scripts prontos para uso
   - Exemplos em Python, Node.js, Bash

## 🚀 Como Usar

### 1. Deploy Inicial

Seguir `DEPLOY_MOZLOJA.md`:
- Configurar servidor
- Instalar dependências
- Configurar Nginx
- Instalar SSL para API
- Iniciar aplicação

### 2. Criar Site WordPress Completo

```bash
# Um único comando cria tudo:
curl -X POST https://api.mozloja.online/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "subdomain": "meusite",
    "type": "wordpress",
    "adminEmail": "admin@example.com"
  }'

# Depois instalar WordPress:
curl -X POST https://api.mozloja.online/api/sites/{SITE_ID}/wordpress/install \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "adminUser": "admin",
    "adminPassword": "SenhaSegura123!",
    "adminEmail": "admin@example.com"
  }'
```

**Resultado:**
- ✅ `meusite.mozloja.online` criado
- ✅ SSL instalado automaticamente
- ✅ WordPress instalado e funcionando
- ✅ Banco de dados criado
- ✅ Container Docker isolado

### 3. Criar Site Estático

```bash
curl -X POST https://api.mozloja.online/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "subdomain": "siteestatico",
    "type": "static"
  }'
```

**Resultado:**
- ✅ `siteestatico.mozloja.online` criado
- ✅ SSL instalado automaticamente
- ✅ FTP configurado para edição

## 📋 Arquivos Importantes

1. **`COMANDOS_EXTERNOS.md`** - Comandos completos para uso externo
2. **`DEPLOY_MOZLOJA.md`** - Guia de deploy passo a passo
3. **`scripts/setup-api-nginx.sh`** - Script de configuração Nginx
4. **`env.example`** - Configurações atualizadas para mozloja.online

## 🔧 Configuração DNS Necessária

```
A     api.mozloja.online    -> IP_DO_SERVIDOR
A     *.mozloja.online      -> IP_DO_SERVIDOR  (wildcard)
```

## ✅ Checklist

- [x] Domínio atualizado para `mozloja.online`
- [x] SSL automático implementado
- [x] Service SSL criado
- [x] Endpoints SSL criados
- [x] Script de setup Nginx criado
- [x] Documentação de comandos externos
- [x] Guia de deploy específico
- [x] Docker Compose atualizado

## 🎯 Próximos Passos

1. Fazer deploy seguindo `DEPLOY_MOZLOJA.md`
2. Configurar DNS
3. Testar criação de sites
4. Usar comandos de `COMANDOS_EXTERNOS.md`

---

**Status**: Pronto para deploy em mozloja.online! 🚀

