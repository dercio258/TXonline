# 🚀 Criação Automática de Sites

## ✨ Funcionalidades Implementadas

Quando um site é criado, o sistema agora:

1. ✅ **Cria o diretório** em `/var/www/subdomain`
2. ✅ **Cria index.html padrão** com template profissional
3. ✅ **Configura Nginx** automaticamente
4. ✅ **Instala SSL** automaticamente (Let's Encrypt)
5. ✅ **Cria usuário FTP** para edição externa
6. ✅ **Registra no banco de dados**

---

## 📄 Template do index.html

O template padrão inclui:

- Design moderno e responsivo
- Cores: Laranja (#ff7a00) e Azul (#0066cc)
- Substituição automática de `{Nome do site}` pelo subdomínio
- Link para painel de configuração
- Mensagem de boas-vindas personalizada

### Exemplo de HTML gerado:

```html
<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Meusite — Bem-vindo</title>
  <style>
    :root{--laranja:#ff7a00;--azul:#0066cc;...}
    ...
  </style>
</head>
<body>
  <div class="card">
    <h1>Seja bem-vindo, Meusite!</h1>
    <p>Esta página foi criada automaticamente pelo <strong>Txuna Site</strong>...</p>
    <a class="cta" href="https://h.panel.txunasite.com">Clique aqui para configurar</a>
  </div>
</body>
</html>
```

---

## 🔒 Instalação Automática de SSL

O SSL é instalado automaticamente usando Let's Encrypt:

1. **Configuração HTTP inicial** - Para validação do Let's Encrypt
2. **Instalação do certificado** - Via Certbot
3. **Atualização do Nginx** - Configuração HTTPS
4. **Recarregamento do Nginx** - Aplicação das mudanças

**Nota**: Se o SSL falhar (ex: DNS não configurado), o site continua funcionando em HTTP e o SSL pode ser instalado depois.

---

## 📋 Fluxo de Criação

```
1. Validar subdomínio (não existe no banco)
2. Verificar se diretório não existe
3. Criar diretório: /var/www/subdomain
4. Criar index.html padrão (para sites estáticos)
5. Configurar Nginx (HTTP inicial)
6. Instalar SSL (Let's Encrypt)
7. Atualizar Nginx (HTTPS)
8. Registrar no banco de dados
9. Criar usuário FTP
10. Retornar informações do site
```

---

## 🧪 Teste de Criação

### Criar um site estático:

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

### Resultado esperado:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "subdomain": "meusite",
    "type": "static",
    "path": "/var/www/meusite",
    "status": "active",
    "ssl": {
      "installed": true,
      "expiresAt": "2025-02-23T..."
    },
    "ftp": {
      "username": "ftp_meusite",
      "password": "...",
      "port": 21
    }
  }
}
```

---

## ✅ Verificações Após Criação

### 1. Verificar diretório e arquivo:

```bash
# Ver diretório criado
ls -la /var/www/meusite

# Ver index.html
cat /var/www/meusite/index.html
```

### 2. Verificar configuração Nginx:

```bash
# Ver configuração
cat /etc/nginx/sites-available/meusite

# Verificar se está habilitado
ls -la /etc/nginx/sites-enabled/meusite
```

### 3. Verificar SSL:

```bash
# Ver certificado
certbot certificates | grep meusite

# Testar HTTPS
curl -I https://meusite.mozloja.online
```

### 4. Testar acesso:

```bash
# HTTP (deve redirecionar para HTTPS)
curl -I http://meusite.mozloja.online

# HTTPS
curl -I https://meusite.mozloja.online
```

---

## 🔧 Recarregar Nginx

Após criar o site, você precisa recarregar o Nginx manualmente (quando em container):

```bash
# Testar configuração
nginx -t

# Recarregar
systemctl reload nginx
```

---

## 🐛 Troubleshooting

### SSL não instalou

**Causas comuns:**
- DNS não configurado para o subdomínio
- Porta 80 bloqueada
- Limite de certificados Let's Encrypt atingido

**Solução:**
```bash
# Instalar SSL manualmente depois
curl -X POST http://localhost:3000/api/ssl/install \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"domain": "meusite.mozloja.online"}'
```

### index.html não foi criado

**Verificar:**
```bash
# Ver se arquivo existe
ls -la /var/www/meusite/index.html

# Ver logs da API
docker compose logs api | grep "index.html"
```

### Nginx não está servindo o site

**Verificar:**
```bash
# Ver configuração
nginx -t

# Ver logs do Nginx
tail -f /var/log/nginx/error.log

# Verificar se diretório existe e tem permissões
ls -ld /var/www/meusite
```

---

## 📝 Checklist de Criação

Após criar um site, verifique:

- [ ] Diretório criado: `ls /var/www/SUBDOMAIN`
- [ ] index.html criado: `cat /var/www/SUBDOMAIN/index.html`
- [ ] Configuração Nginx criada: `ls /etc/nginx/sites-enabled/SUBDOMAIN`
- [ ] SSL instalado: `certbot certificates | grep SUBDOMAIN`
- [ ] Nginx recarregado: `systemctl reload nginx`
- [ ] Site acessível: `curl https://SUBDOMAIN.mozloja.online`
- [ ] Site no banco: verificar com SELECT

---

**Agora os sites são criados automaticamente com SSL e página padrão!** 🎉

