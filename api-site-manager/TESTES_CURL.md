# Guia de Testes com cURL - TxunaSites API Manager

## Configuração Inicial

1. Configure o arquivo `.env`:
```bash
cp env.example .env
# Edite o .env com suas configurações
```

2. Inicie o servidor:
```bash
npm install
npm start
```

3. Defina a variável de ambiente para os testes:
```bash
export API_KEY="your-secret-api-key-here"
```

## Exemplos de Testes

### 1. Health Check
```bash
curl http://localhost:3000/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "TxunaSites API Manager"
}
```

### 2. Criar Site (WordPress)
```bash
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "subdomain": "meusite",
    "type": "wordpress",
    "adminEmail": "admin@example.com",
    "adminUser": "admin",
    "adminPassword": "senhaSegura123!",
    "storageLimit": 2000
  }'
```

### 3. Criar Site (Estático)
```bash
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "subdomain": "siteestatico",
    "type": "static",
    "storageLimit": 500
  }'
```

### 4. Listar Todos os Sites
```bash
curl -X GET http://localhost:3000/api/sites \
  -H "X-API-Key: $API_KEY"
```

### 5. Obter Detalhes de um Site
```bash
curl -X GET http://localhost:3000/api/sites/{site-id} \
  -H "X-API-Key: $API_KEY"
```

### 6. Instalar WordPress em um Site
```bash
curl -X POST http://localhost:3000/api/sites/{site-id}/wordpress/install \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "adminEmail": "admin@example.com",
    "adminUser": "admin",
    "adminPassword": "senhaSegura123!"
  }'
```

### 7. Obter Credenciais do WordPress
```bash
curl -X GET http://localhost:3000/api/sites/{site-id}/wordpress/credentials \
  -H "X-API-Key: $API_KEY"
```

### 8. Listar Plugins WordPress
```bash
curl -X GET http://localhost:3000/api/sites/{site-id}/wordpress/plugins \
  -H "X-API-Key: $API_KEY"
```

### 9. Instalar Plugin WordPress
```bash
curl -X POST http://localhost:3000/api/sites/{site-id}/wordpress/plugins \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "pluginName": "contact-form-7",
    "pluginVersion": "5.7"
  }'
```

### 10. Remover Plugin WordPress
```bash
curl -X DELETE http://localhost:3000/api/sites/{site-id}/wordpress/plugins/contact-form-7 \
  -H "X-API-Key: $API_KEY"
```

### 11. Upload de Arquivos
```bash
curl -X POST http://localhost:3000/api/sites/{site-id}/files/upload \
  -H "X-API-Key: $API_KEY" \
  -F "files=@index.html" \
  -F "files=@style.css"
```

### 12. Listar Arquivos
```bash
curl -X GET http://localhost:3000/api/sites/{site-id}/files \
  -H "X-API-Key: $API_KEY"
```

### 13. Listar Arquivos em Subdiretório
```bash
curl -X GET "http://localhost:3000/api/sites/{site-id}/files?path=css" \
  -H "X-API-Key: $API_KEY"
```

### 14. Deletar Arquivo
```bash
curl -X DELETE http://localhost:3000/api/sites/{site-id}/files/css/style.css \
  -H "X-API-Key: $API_KEY"
```

### 15. Fazer Deploy de Arquivos
```bash
curl -X POST http://localhost:3000/api/sites/{site-id}/files/deploy \
  -H "X-API-Key: $API_KEY"
```

### 16. Obter Uso de Armazenamento
```bash
curl -X GET http://localhost:3000/api/sites/{site-id}/storage \
  -H "X-API-Key: $API_KEY"
```

### 17. Obter Estatísticas do Site
```bash
curl -X GET http://localhost:3000/api/sites/{site-id}/stats \
  -H "X-API-Key: $API_KEY"
```

### 18. Monitoramento Global
```bash
curl -X GET http://localhost:3000/api/monitoring/all \
  -H "X-API-Key: $API_KEY"
```

### 19. Criar Subdomínio
```bash
curl -X POST http://localhost:3000/api/subdomains \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "subdomain": "novosite"
  }'
```

### 20. Listar Subdomínios
```bash
curl -X GET http://localhost:3000/api/subdomains \
  -H "X-API-Key: $API_KEY"
```

### 21. Deletar Subdomínio
```bash
curl -X DELETE http://localhost:3000/api/subdomains/novosite \
  -H "X-API-Key: $API_KEY"
```

### 22. Atualizar Site
```bash
curl -X PUT http://localhost:3000/api/sites/{site-id} \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "storageLimit": 3000,
    "status": "active"
  }'
```

### 23. Deletar Site
```bash
curl -X DELETE http://localhost:3000/api/sites/{site-id} \
  -H "X-API-Key: $API_KEY"
```

## Testes de Erro

### Teste sem API Key (deve retornar 401)
```bash
curl -X GET http://localhost:3000/api/sites
```

### Teste com API Key inválida (deve retornar 401)
```bash
curl -X GET http://localhost:3000/api/sites \
  -H "X-API-Key: invalid-key"
```

### Teste com dados inválidos (deve retornar 400)
```bash
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "subdomain": "ab"  # Muito curto
  }'
```

## Script de Teste Automatizado

Crie um arquivo `test-api.sh`:

```bash
#!/bin/bash

API_KEY="your-api-key"
BASE_URL="http://localhost:3000"

echo "=== Testando Health Check ==="
curl -s "$BASE_URL/health" | jq .

echo -e "\n=== Criando Site WordPress ==="
RESPONSE=$(curl -s -X POST "$BASE_URL/api/sites" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "subdomain": "teste",
    "type": "wordpress",
    "adminEmail": "test@example.com"
  }')

echo "$RESPONSE" | jq .
SITE_ID=$(echo "$RESPONSE" | jq -r '.data.id')

echo -e "\n=== Listando Sites ==="
curl -s "$BASE_URL/api/sites" \
  -H "X-API-Key: $API_KEY" | jq .

echo -e "\n=== Obtendo Detalhes do Site ==="
curl -s "$BASE_URL/api/sites/$SITE_ID" \
  -H "X-API-Key: $API_KEY" | jq .
```

Torne executável e execute:
```bash
chmod +x test-api.sh
./test-api.sh
```

