# Comandos para Uso Externo - TxunaSites API

## 🌐 Configuração da API

A API está configurada para:
- **Domínio**: `api.mozloja.online`
- **Path**: `/var/www/mozloja.online`
- **Porta**: `3000` (interna)
- **SSL**: Automático com Let's Encrypt

## 🔑 Autenticação

Todas as requisições precisam do header:
```
X-API-Key: sua-api-key-aqui
```

## 📋 Comandos Principais

### 1. Criar Site WordPress Completo (com SSL e WordPress)

```bash
# Passo 1: Criar site
SITE_RESPONSE=$(curl -s -X POST https://api.mozloja.online/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "subdomain": "meusite",
    "type": "wordpress",
    "adminEmail": "admin@example.com",
    "storageLimit": 2000
  }')

# Extrair ID do site
SITE_ID=$(echo $SITE_RESPONSE | jq -r '.data.id')
echo "Site criado com ID: $SITE_ID"

# Passo 2: Instalar WordPress (cria banco, container e instala)
curl -X POST https://api.mozloja.online/api/sites/$SITE_ID/wordpress/install \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "adminUser": "admin",
    "adminPassword": "SenhaSegura123!",
    "adminEmail": "admin@example.com"
  }'
```

**Resultado:**
- ✅ Subdomínio criado: `meusite.mozloja.online`
- ✅ SSL instalado automaticamente
- ✅ Banco de dados MySQL criado
- ✅ Container WordPress criado
- ✅ WordPress instalado e configurado
- ✅ Credenciais disponíveis

### 2. Criar Site Estático (HTML/CSS/JS)

```bash
curl -X POST https://api.mozloja.online/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "subdomain": "siteestatico",
    "type": "static",
    "storageLimit": 500
  }'
```

**Resultado:**
- ✅ Subdomínio criado: `siteestatico.mozloja.online`
- ✅ SSL instalado automaticamente
- ✅ Diretório criado em `/var/www/siteestatico`
- ✅ FTP configurado para edição

### 3. Upload de Arquivos para Site Estático

```bash
# Upload de arquivos
curl -X POST https://api.mozloja.online/api/sites/{SITE_ID}/files/upload \
  -H "X-API-Key: SUA_API_KEY" \
  -F "files=@index.html" \
  -F "files=@style.css" \
  -F "files=@script.js"
```

### 4. Instalar Plugin WordPress

```bash
curl -X POST https://api.mozloja.online/api/sites/{SITE_ID}/wordpress/plugins \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "pluginName": "contact-form-7",
    "pluginVersion": "5.7"
  }'
```

### 5. Obter Credenciais do Site

```bash
# Credenciais WordPress
curl https://api.mozloja.online/api/sites/{SITE_ID}/wordpress/credentials \
  -H "X-API-Key: SUA_API_KEY"

# Credenciais FTP
curl https://api.mozloja.online/api/sites/{SITE_ID}/ftp \
  -H "X-API-Key: SUA_API_KEY"
```

### 6. Monitoramento

```bash
# Uso de armazenamento
curl https://api.mozloja.online/api/sites/{SITE_ID}/storage \
  -H "X-API-Key: SUA_API_KEY"

# Uso de RAM
curl https://api.mozloja.online/api/sites/{SITE_ID}/ram \
  -H "X-API-Key: SUA_API_KEY"

# Estatísticas completas
curl https://api.mozloja.online/api/sites/{SITE_ID}/stats \
  -H "X-API-Key: SUA_API_KEY"

# Monitoramento global
curl https://api.mozloja.online/api/monitoring/all \
  -H "X-API-Key: SUA_API_KEY"
```

### 7. Listar Todos os Sites

```bash
curl https://api.mozloja.online/api/sites \
  -H "X-API-Key: SUA_API_KEY"
```

### 8. Deletar Site

```bash
curl -X DELETE https://api.mozloja.online/api/sites/{SITE_ID} \
  -H "X-API-Key: SUA_API_KEY"
```

**Resultado:**
- ✅ Container WordPress removido
- ✅ Banco de dados removido
- ✅ Volume Docker removido
- ✅ Subdomínio removido do Nginx
- ✅ Usuário FTP removido
- ✅ Arquivos removidos

## 🚀 Script Completo de Criação

Crie um arquivo `criar-site.sh`:

```bash
#!/bin/bash

API_URL="https://api.mozloja.online"
API_KEY="SUA_API_KEY_AQUI"
SUBDOMAIN=$1
ADMIN_EMAIL=$2
ADMIN_PASSWORD=$3

if [ -z "$SUBDOMAIN" ] || [ -z "$ADMIN_EMAIL" ]; then
    echo "Uso: ./criar-site.sh <subdomain> <admin-email> [admin-password]"
    exit 1
fi

echo "🚀 Criando site WordPress: $SUBDOMAIN.mozloja.online"

# Criar site
SITE_RESPONSE=$(curl -s -X POST $API_URL/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{
    \"subdomain\": \"$SUBDOMAIN\",
    \"type\": \"wordpress\",
    \"adminEmail\": \"$ADMIN_EMAIL\",
    \"storageLimit\": 2000
  }")

SITE_ID=$(echo $SITE_RESPONSE | jq -r '.data.id')

if [ "$SITE_ID" == "null" ] || [ -z "$SITE_ID" ]; then
    echo "❌ Erro ao criar site"
    echo $SITE_RESPONSE | jq .
    exit 1
fi

echo "✅ Site criado: $SITE_ID"
echo "📦 Instalando WordPress..."

# Instalar WordPress
WP_RESPONSE=$(curl -s -X POST $API_URL/api/sites/$SITE_ID/wordpress/install \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{
    \"adminUser\": \"admin\",
    \"adminPassword\": \"${ADMIN_PASSWORD:-$(openssl rand -base64 12)}\",
    \"adminEmail\": \"$ADMIN_EMAIL\"
  }")

echo "✅ WordPress instalado!"
echo ""
echo "📋 Informações do site:"
echo "   URL: https://$SUBDOMAIN.mozloja.online"
echo "   Admin: https://$SUBDOMAIN.mozloja.online/wp-admin"
echo ""
echo "$WP_RESPONSE" | jq -r '.data | "   Usuário: \(.adminUser)\n   Senha: \(.adminPassword)"'
```

Tornar executável e usar:
```bash
chmod +x criar-site.sh
./criar-site.sh meusite admin@example.com MinhaSenha123!
```

## 🔒 SSL Automático

O SSL é instalado automaticamente quando:
- Um novo subdomínio é criado
- A opção `USE_SSL=true` está no `.env`

Para instalar SSL manualmente em um domínio existente:
```bash
curl -X POST https://api.mozloja.online/api/ssl/install \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "domain": "meusite.mozloja.online",
    "email": "admin@mozloja.online"
  }'
```

## 📊 Exemplos de Integração

### Python
```python
import requests

API_URL = "https://api.mozloja.online"
API_KEY = "sua-api-key"

# Criar site
response = requests.post(
    f"{API_URL}/api/sites",
    headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
    json={
        "subdomain": "meusite",
        "type": "wordpress",
        "adminEmail": "admin@example.com"
    }
)

site_id = response.json()["data"]["id"]

# Instalar WordPress
requests.post(
    f"{API_URL}/api/sites/{site_id}/wordpress/install",
    headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
    json={
        "adminUser": "admin",
        "adminPassword": "SenhaSegura123!",
        "adminEmail": "admin@example.com"
    }
)
```

### Node.js
```javascript
const axios = require('axios');

const API_URL = 'https://api.mozloja.online';
const API_KEY = 'sua-api-key';

async function criarSiteWordPress(subdomain, email) {
  // Criar site
  const siteResponse = await axios.post(
    `${API_URL}/api/sites`,
    {
      subdomain,
      type: 'wordpress',
      adminEmail: email,
      storageLimit: 2000
    },
    { headers: { 'X-API-Key': API_KEY } }
  );
  
  const siteId = siteResponse.data.data.id;
  
  // Instalar WordPress
  const wpResponse = await axios.post(
    `${API_URL}/api/sites/${siteId}/wordpress/install`,
    {
      adminUser: 'admin',
      adminPassword: 'SenhaSegura123!',
      adminEmail: email
    },
    { headers: { 'X-API-Key': API_KEY } }
  );
  
  return wpResponse.data;
}
```

## ✅ Health Check

```bash
curl https://api.mozloja.online/health
```

## 📝 Notas Importantes

1. **SSL Automático**: Instalado automaticamente para todos os subdomínios
2. **Banco de Dados**: Criado dinamicamente para cada WordPress
3. **Container Docker**: Isolado por site
4. **FTP**: Configurado automaticamente para edição externa
5. **Monitoramento**: Disponível em tempo real

## 🔧 Troubleshooting

### Verificar se API está rodando
```bash
curl https://api.mozloja.online/health
```

### Ver logs
```bash
# Se usando PM2
pm2 logs txuna-api-manager

# Se usando Docker
docker-compose logs api
```

### Verificar SSL
```bash
curl https://api.mozloja.online/api/ssl/info/api.mozloja.online \
  -H "X-API-Key: SUA_API_KEY"
```

