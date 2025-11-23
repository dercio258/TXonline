# Testes da API - Guia Completo

## 🎯 Testes Enquanto a API Está Funcionando

### Pré-requisitos

1. API rodando: `docker compose ps` deve mostrar `txuna-api` como `Up`
2. Health check funcionando: `curl http://localhost:3000/health`
3. API Key configurada no `.env`

---

## 1. ✅ Health Check (Teste Básico)

### Verificar se API está respondendo

```bash
curl http://localhost:3000/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-21T23:00:00.000Z",
  "service": "TxunaSites API Manager"
}
```

**O que testa:**
- API está rodando
- Servidor responde a requisições
- Endpoint básico funciona

---

## 2. 🔐 Teste de Autenticação

### Teste sem API Key (deve falhar)

```bash
curl -X GET http://localhost:3000/api/sites
```

**Resposta esperada:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

**O que testa:**
- Autenticação está funcionando
- Requisições sem API key são rejeitadas

### Teste com API Key inválida (deve falhar)

```bash
curl -X GET http://localhost:3000/api/sites \
  -H "X-API-Key: VIDQdadA26izfF2x5WPvrG9Y0JKkux6ntK4D4yhuEuM="
```

**Resposta esperada:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

**O que testa:**
- Validação de API key
- Segurança básica

---

## 3. 📋 Teste de Listagem de Sites

### Listar todos os sites (deve retornar vazio inicialmente)

```bash
curl -X GET http://localhost:3000/api/sites \
  -H "X-API-Key: $API_KEY"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

**O que testa:**
- Endpoint de listagem funciona
- Conexão com banco de dados
- Autenticação com API key válida
- Resposta JSON correta

---

## 4. 🆕 Teste de Criação de Site Estático

### Criar site estático (HTML/CSS/JS)

```bash
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: VIDQdadA26izfF2x5WPvrG9Y0JKkux6ntK4D4yhuEuM=" \
  -d '{
    "subdomain": "Neonlife",
    "type": "static",
    "storageLimit": 500
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-aqui",
    "subdomain": "teste",
    "type": "static",
    "path": "/var/www/teste",
    "storageLimit": 524288000,
    "status": "active",
    "createdAt": "2025-11-21T23:00:00.000Z",
    "ftp": {
      "username": "ftp_teste",
      "password": "senha-gerada",
      "home": "/var/www/teste",
      "port": 21
    }
  },
  "message": "Site created successfully"
}
```

**O que testa:**
- Criação de site no banco de dados
- Criação de diretório no filesystem
- Criação de subdomínio no Nginx
- Criação de usuário FTP
- Instalação de SSL (se configurado)
- Retorno correto de dados

**Verificações adicionais:**
```bash
# Verificar se diretório foi criado
ls -la /var/www/teste

# Verificar se subdomínio foi criado no Nginx
ls -la /etc/nginx/sites-enabled/teste

# Verificar no banco de dados
docker compose exec mysql mysql -u txuna_user -p$DB_PASSWORD txuna_sites -e "SELECT * FROM sites WHERE subdomain='teste'"
```

---

## 5. 🎨 Teste de Criação de Site WordPress

### Criar site WordPress

```bash
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY_AQUI" \
  -d '{
    "subdomain": "wpteste",
    "type": "wordpress",
    "adminEmail": "admin@teste.com",
    "storageLimit": 2000
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-aqui",
    "subdomain": "wpteste",
    "type": "wordpress",
    "path": "/var/www/wpteste",
    "ftp": {
      "username": "ftp_wpteste",
      "password": "senha-gerada"
    }
  }
}
```

**O que testa:**
- Criação de site WordPress
- Criação de diretório
- Criação de subdomínio
- FTP configurado

---

## 6. 📦 Teste de Instalação WordPress

### Instalar WordPress no site criado

```bash
# Primeiro, obter o ID do site criado (do teste anterior)
SITE_ID="uuid-do-site-criado"

curl -X POST http://localhost:3000/api/sites/$SITE_ID/wordpress/install \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY_AQUI" \
  -d '{
    "adminUser": "admin",
    "adminPassword": "SenhaSegura123!",
    "adminEmail": "admin@teste.com"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "adminUser": "admin",
    "adminPassword": "SenhaSegura123!",
    "adminEmail": "admin@teste.com",
    "url": "https://wpteste.mozloja.online",
    "container": {
      "containerId": "id-aqui",
      "containerName": "wp-wpteste",
      "status": "running"
    },
    "database": {
      "name": "wp_wpteste",
      "user": "wp_wpteste"
    }
  },
  "message": "WordPress installed successfully"
}
```

**O que testa:**
- Criação de banco de dados MySQL dinamicamente
- Criação de container Docker WordPress
- Instalação do WordPress via WP-CLI
- Configuração de credenciais
- Volume Docker criado
- Container iniciado e rodando

**Verificações adicionais:**
```bash
# Verificar container WordPress
docker ps | grep wp-wpteste

# Verificar banco de dados criado
docker compose exec mysql mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW DATABASES LIKE 'wp_wpteste'"

# Verificar volume Docker
docker volume ls | grep wp-wpteste

# Testar acesso ao site
curl -I https://wpteste.mozloja.online
```

---

## 7. 📁 Teste de Upload de Arquivos

### Upload de arquivos para site estático

```bash
# Criar arquivo de teste
echo "<h1>Teste</h1>" > /tmp/teste.html

curl -X POST http://localhost:3000/api/sites/$SITE_ID/files/upload \
  -H "X-API-Key: SUA_API_KEY_AQUI" \
  -F "files=@/tmp/teste.html"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "name": "teste.html",
        "path": "/var/www/teste/public/teste.html",
        "size": 15,
        "uploadedAt": "2025-11-21T23:00:00.000Z"
      }
    ],
    "totalSize": 15,
    "count": 1
  },
  "message": "1 file(s) uploaded successfully"
}
```

**O que testa:**
- Upload de arquivos funciona
- Validação de tamanho
- Verificação de limites de armazenamento
- Organização de arquivos
- Retorno correto

**Verificações:**
```bash
# Verificar se arquivo foi criado
ls -la /var/www/teste/public/teste.html

# Verificar conteúdo
cat /var/www/teste/public/teste.html
```

---

## 8. 📊 Teste de Monitoramento

### Ver uso de armazenamento

```bash
curl -X GET http://localhost:3000/api/sites/$SITE_ID/storage \
  -H "X-API-Key: SUA_API_KEY_AQUI"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "siteId": "uuid-aqui",
    "used": 15728640,
    "usedMB": "15.00",
    "usedGB": "0.01",
    "limit": 524288000,
    "limitMB": "500.00",
    "percentage": "3.00",
    "warning": false,
    "critical": false
  }
}
```

**O que testa:**
- Cálculo de uso de armazenamento
- Integração com filesystem
- Cálculo de percentuais
- Alertas (warning/critical)

### Ver uso de RAM (WordPress)

```bash
curl -X GET http://localhost:3000/api/sites/$SITE_ID/ram \
  -H "X-API-Key: SUA_API_KEY_AQUI"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "siteId": "uuid-aqui",
    "used": 134217728,
    "usedMB": "128.00",
    "limit": 536870912,
    "limitMB": "512.00",
    "percentage": "23.84",
    "cpuPercent": "2.50",
    "warning": false,
    "critical": false
  }
}
```

**O que testa:**
- Integração com Docker Stats API
- Monitoramento de RAM do container
- Monitoramento de CPU
- Alertas de sobrecarga

### Estatísticas completas

```bash
curl -X GET http://localhost:3000/api/sites/$SITE_ID/stats \
  -H "X-API-Key: SUA_API_KEY_AQUI"
```

**O que testa:**
- Combinação de todos os dados de monitoramento
- Informações do WordPress (se aplicável)
- Última atividade
- Status geral

---

## 9. 🔌 Teste de Plugins WordPress

### Listar plugins

```bash
curl -X GET http://localhost:3000/api/sites/$SITE_ID/wordpress/plugins \
  -H "X-API-Key: SUA_API_KEY_AQUI"
```

**O que testa:**
- Execução de comandos WP-CLI no container
- Listagem de plugins
- Integração com container Docker

### Instalar plugin

```bash
curl -X POST http://localhost:3000/api/sites/$SITE_ID/wordpress/plugins \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY_AQUI" \
  -d '{
    "pluginName": "contact-form-7",
    "pluginVersion": "5.7"
  }'
```

**O que testa:**
- Instalação de plugin via WP-CLI
- Validação de plugin
- Ativação automática
- Salvamento no banco de dados

---

## 10. 🔑 Teste de Credenciais

### Obter credenciais WordPress

```bash
curl -X GET http://localhost:3000/api/sites/$SITE_ID/wordpress/credentials \
  -H "X-API-Key: SUA_API_KEY_AQUI"
```

**O que testa:**
- Recuperação de credenciais do banco
- Segurança (senhas não expostas diretamente)
- Informações corretas

### Obter credenciais FTP

```bash
curl -X GET http://localhost:3000/api/sites/$SITE_ID/ftp \
  -H "X-API-Key: SUA_API_KEY_AQUI"
```

**O que testa:**
- Credenciais FTP criadas
- Informações de acesso
- Configuração correta

---

## 11. 📝 Teste de Comunicação/Interatividade

### Enviar mensagem

```bash
curl -X POST http://localhost:3000/api/sites/$SITE_ID/communication/message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY_AQUI" \
  -d '{
    "message": "Teste de comunicação",
    "type": "general",
    "metadata": {
      "source": "test",
      "timestamp": "2025-11-21T23:00:00Z"
    }
  }'
```

**O que testa:**
- Sistema de mensagens
- Salvamento no banco de dados
- Metadados JSON
- Timestamps

### Listar mensagens

```bash
curl -X GET "http://localhost:3000/api/sites/$SITE_ID/communication/messages?limit=10" \
  -H "X-API-Key: SUA_API_KEY_AQUI"
```

**O que testa:**
- Recuperação de mensagens
- Paginação (limit/offset)
- Filtros por tipo
- Ordenação

---

## 12. 🗑️ Teste de Deleção

### Deletar site

```bash
curl -X DELETE http://localhost:3000/api/sites/$SITE_ID \
  -H "X-API-Key: SUA_API_KEY_AQUI"
```

**O que testa:**
- Remoção do banco de dados
- Remoção de container Docker (se WordPress)
- Remoção de volume Docker
- Remoção de subdomínio do Nginx
- Remoção de usuário FTP
- Limpeza completa

**Verificações:**
```bash
# Verificar se container foi removido
docker ps -a | grep wp-teste

# Verificar se banco foi removido
docker compose exec mysql mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW DATABASES" | grep wp_teste

# Verificar se diretório foi removido (ou marcado como deleted)
ls -la /var/www/teste
```

---

## 13. 🔄 Teste de Atualização

### Atualizar site

```bash
curl -X PUT http://localhost:3000/api/sites/$SITE_ID \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY_AQUI" \
  -d '{
    "storageLimit": 3000,
    "status": "active"
  }'
```

**O que testa:**
- Atualização no banco de dados
- Validação de campos
- Retorno de dados atualizados

---

## 14. 🌐 Teste de Subdomínios

### Listar subdomínios

```bash
curl -X GET http://localhost:3000/api/subdomains \
  -H "X-API-Key: SUA_API_KEY_AQUI"
```

**O que testa:**
- Listagem de subdomínios criados
- Integração com banco de dados

### Criar subdomínio manualmente

```bash
curl -X POST http://localhost:3000/api/subdomains \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY_AQUI" \
  -d '{
    "subdomain": "teste-subdomain"
  }'
```

**O que testa:**
- Criação de configuração Nginx
- Instalação de SSL automática
- Configuração de proxy

---

## 15. 🔒 Teste de SSL

### Verificar informações SSL

```bash
curl -X GET http://localhost:3000/api/ssl/info/teste.mozloja.online \
  -H "X-API-Key: SUA_API_KEY_AQUI"
```

**O que testa:**
- Verificação de certificado SSL
- Data de expiração
- Status de instalação

### Instalar SSL manualmente

```bash
curl -X POST http://localhost:3000/api/ssl/install \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY_AQUI" \
  -d '{
    "domain": "teste.mozloja.online",
    "email": "admin@mozloja.online"
  }'
```

**O que testa:**
- Integração com Certbot
- Instalação de certificado Let's Encrypt
- Configuração Nginx com SSL

---

## 16. 📈 Teste de Monitoramento Global

### Monitoramento de todos os sites

```bash
curl -X GET http://localhost:3000/api/monitoring/all \
  -H "X-API-Key: SUA_API_KEY_AQUI"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "totalSites": 2,
    "totalStorage": 31457280,
    "totalStorageMB": "30.00",
    "totalStorageGB": "0.03",
    "sites": [
      {
        "site": {
          "id": "uuid-1",
          "subdomain": "teste",
          "type": "static"
        },
        "storage": { ... },
        "ram": { ... }
      }
    ],
    "timestamp": "2025-11-21T23:00:00.000Z"
  }
}
```

**O que testa:**
- Agregação de dados de todos os sites
- Cálculos totais
- Performance (múltiplas consultas)

---

## 17. ⚠️ Teste de Validação

### Teste com dados inválidos

```bash
# Subdomínio muito curto
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY_AQUI" \
  -d '{
    "subdomain": "ab"
  }'
```

**Resposta esperada:**
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    "\"subdomain\" length must be at least 3 characters long"
  ]
}
```

**O que testa:**
- Validação de entrada
- Mensagens de erro claras
- Rejeição de dados inválidos

---

## 18. 🚀 Teste de Performance

### Teste de carga básico

```bash
# Múltiplas requisições simultâneas
for i in {1..10}; do
  curl -X GET http://localhost:3000/api/sites \
    -H "X-API-Key: SUA_API_KEY_AQUI" &
done
wait
```

**O que testa:**
- Performance sob carga
- Pool de conexões do banco
- Tratamento de requisições concorrentes

---

## 19. 🔍 Teste de Logs

### Verificar logs da API

```bash
docker compose logs api --tail=50
```

**O que verificar:**
- Logs estruturados
- Níveis de log (info, error, warn)
- Timestamps corretos
- Informações úteis para debug

---

## 20. 🧪 Teste End-to-End Completo

### Fluxo completo: Criar → Instalar WordPress → Monitorar → Deletar

```bash
# 1. Criar site WordPress
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY_AQUI" \
  -d '{
    "subdomain": "e2e-test",
    "type": "wordpress",
    "adminEmail": "test@example.com"
  }')

SITE_ID=$(echo $CREATE_RESPONSE | jq -r '.data.id')
echo "Site criado: $SITE_ID"

# 2. Instalar WordPress
curl -X POST http://localhost:3000/api/sites/$SITE_ID/wordpress/install \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "adminUser": "admin",
    "adminPassword": "Test123!",
    "adminEmail": "test@example.com"
  }'

# 3. Aguardar instalação
sleep 30

# 4. Verificar monitoramento
curl -X GET http://localhost:3000/api/sites/$SITE_ID/stats \
  -H "X-API-Key: SUA_API_KEY_AQUI"

# 5. Deletar site
curl -X DELETE http://localhost:3000/api/sites/$SITE_ID \
  -H "X-API-Key: SUA_API_KEY_AQUI"
```

**O que testa:**
- Fluxo completo do sistema
- Integração entre componentes
- Limpeza adequada

---

## 📊 Checklist de Testes

Marque conforme testar:

- [ ] Health check funciona
- [ ] Autenticação rejeita requisições inválidas
- [ ] Listagem de sites funciona
- [ ] Criação de site estático funciona
- [ ] Criação de site WordPress funciona
- [ ] Instalação WordPress cria banco e container
- [ ] Upload de arquivos funciona
- [ ] Monitoramento de armazenamento funciona
- [ ] Monitoramento de RAM funciona (WordPress)
- [ ] Listagem de plugins funciona
- [ ] Instalação de plugin funciona
- [ ] Obtenção de credenciais funciona
- [ ] Sistema de comunicação funciona
- [ ] Deleção de site limpa tudo
- [ ] Atualização de site funciona
- [ ] Validação rejeita dados inválidos
- [ ] SSL pode ser instalado
- [ ] Monitoramento global funciona

---

## 🎯 Ordem Recomendada de Testes

1. **Básicos**: Health check → Autenticação → Listagem
2. **Criação**: Site estático → Site WordPress → Instalação WP
3. **Operações**: Upload → Monitoramento → Plugins
4. **Avançados**: Comunicação → SSL → Monitoramento global
5. **Limpeza**: Deleção → Verificar limpeza completa

---

## 💡 Dicas

1. **Use jq para parsing JSON:**
   ```bash
   curl ... | jq '.data.id'
   ```

2. **Salve IDs em variáveis:**
   ```bash
   SITE_ID=$(curl ... | jq -r '.data.id')
   ```

3. **Verifique logs durante testes:**
   ```bash
   docker compose logs -f api
   ```

4. **Teste em ambiente isolado primeiro:**
   - Use subdomínios de teste
   - Delete após testar
   - Não teste em produção

---

**Status**: Guia completo de testes sem scripts! 🧪

