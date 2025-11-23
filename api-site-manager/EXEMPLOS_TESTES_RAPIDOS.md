# Exemplos Rápidos de Testes - Copy & Paste

## 🔑 Configurar Variável de Ambiente

```bash
# No servidor, definir API_KEY
export API_KEY="VIDQdadA26izfF2x5WPvrG9Y0JKkux6ntK4D4yhuEuM="

# Ou usar diretamente nos comandos
```

---

## ✅ Teste 1: Health Check

```bash
curl http://localhost:3000/health
```

---

## ✅ Teste 2: Listar Sites (deve retornar vazio)

```bash
curl -X GET http://localhost:3000/api/sites \
  -H "X-API-Key: VIDQdadA26izfF2x5WPvrG9Y0JKkux6ntK4D4yhuEuM="
```

---

## ✅ Teste 3: Criar Site Estático

```bash
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: VIDQdadA26izfF2x5WPvrG9Y0JKkux6ntK4D4yhuEuM=" \
  -d '{
    "subdomain": "teste1",
    "type": "static",
    "storageLimit": 500
  }'
```

**Salvar o ID retornado para próximos testes!**

---

## ✅ Teste 4: Criar Site WordPress

```bash
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: VIDQdadA26izfF2x5WPvrG9Y0JKkux6ntK4D4yhuEuM=" \
  -d '{
    "subdomain": "wpteste1",
    "type": "wordpress",
    "adminEmail": "admin@teste.com",
    "storageLimit": 2000
  }'
```

---

## ✅ Teste 5: Instalar WordPress (substituir SITE_ID)

```bash
# Primeiro, obter o ID do site criado acima
# Depois executar:

curl -X POST http://localhost:3000/api/sites/SITE_ID_AQUI/wordpress/install \
  -H "Content-Type: application/json" \
  -H "X-API-Key: VIDQdadA26izfF2x5WPvrG9Y0JKkux6ntK4D4yhuEuM=" \
  -d '{
    "adminUser": "admin",
    "adminPassword": "SenhaTeste123!",
    "adminEmail": "admin@teste.com"
  }'
```

---

## ✅ Teste 6: Ver Monitoramento (substituir SITE_ID)

```bash
# Armazenamento
curl -X GET http://localhost:3000/api/sites/SITE_ID_AQUI/storage \
  -H "X-API-Key: VIDQdadA26izfF2x5WPvrG9Y0JKkux6ntK4D4yhuEuM="

# RAM (apenas WordPress)
curl -X GET http://localhost:3000/api/sites/SITE_ID_AQUI/ram \
  -H "X-API-Key: VIDQdadA26izfF2x5WPvrG9Y0JKkux6ntK4D4yhuEuM="

# Estatísticas completas
curl -X GET http://localhost:3000/api/sites/SITE_ID_AQUI/stats \
  -H "X-API-Key: VIDQdadA26izfF2x5WPvrG9Y0JKkux6ntK4D4yhuEuM="
```

---

## ✅ Teste 7: Obter Credenciais FTP

```bash
curl -X GET http://localhost:3000/api/sites/SITE_ID_AQUI/ftp \
  -H "X-API-Key: VIDQdadA26izfF2x5WPvrG9Y0JKkux6ntK4D4yhuEuM="
```

---

## ✅ Teste 8: Upload de Arquivo

```bash
# Criar arquivo de teste
echo "<h1>Teste</h1>" > /tmp/teste.html

curl -X POST http://localhost:3000/api/sites/SITE_ID_AQUI/files/upload \
  -H "X-API-Key: VIDQdadA26izfF2x5WPvrG9Y0JKkux6ntK4D4yhuEuM=" \
  -F "files=@/tmp/teste.html"
```

---

## ✅ Teste 9: Listar Arquivos

```bash
curl -X GET http://localhost:3000/api/sites/SITE_ID_AQUI/files \
  -H "X-API-Key: VIDQdadA26izfF2x5WPvrG9Y0JKkux6ntK4D4yhuEuM="
```

---

## ✅ Teste 10: Monitoramento Global

```bash
curl -X GET http://localhost:3000/api/monitoring/all \
  -H "X-API-Key: VIDQdadA26izfF2x5WPvrG9Y0JKkux6ntK4D4yhuEuM="
```

---

## 🗑️ Limpeza: Deletar Site

```bash
curl -X DELETE http://localhost:3000/api/sites/SITE_ID_AQUI \
  -H "X-API-Key: VIDQdadA26izfF2x5WPvrG9Y0JKkux6ntK4D4yhuEuM="
```

---

## 💡 Dica: Usar Variáveis

```bash
# Definir API Key
export API_KEY="VIDQdadA26izfF2x5WPvrG9Y0JKkux6ntK4D4yhuEuM="

# Criar site e salvar ID
RESPONSE=$(curl -s -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "subdomain": "teste-completo",
    "type": "wordpress",
    "adminEmail": "test@example.com"
  }')

SITE_ID=$(echo $RESPONSE | jq -r '.data.id')
echo "Site ID: $SITE_ID"

# Usar o ID nos próximos comandos
curl -X GET http://localhost:3000/api/sites/$SITE_ID/storage \
  -H "X-API-Key: $API_KEY"
```

---

## 🔍 Verificar Resultados

### Ver logs em tempo real:
```bash
docker compose logs -f api
```

### Ver containers:
```bash
docker compose ps
```

### Ver diretórios criados:
```bash
ls -la /var/www/
```

### Ver configurações Nginx:
```bash
ls -la /etc/nginx/sites-enabled/ | grep teste
```

---

**Pronto para copiar e colar!** 🚀

