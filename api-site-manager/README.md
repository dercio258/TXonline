# TxunaSites - API Site Manager

API para gerenciamento automático de sites, instalação de WordPress e criação de subdomínios.

## Funcionalidades

- ✅ Criação automática de subdomínios
- ✅ Instalação e configuração automática do WordPress
- ✅ Upload e gerenciamento de arquivos estáticos
- ✅ Monitoramento de uso de armazenamento
- ✅ Limitação de uploads e plugins
- ✅ Gerenciamento de SSL automático

## Instalação

```bash
npm install
cp .env.example .env
# Edite o .env com suas configurações
```

## Uso

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

## Endpoints

### Criar Site
```bash
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "subdomain": "meusite",
    "type": "wordpress",
    "admin_email": "admin@example.com"
  }'
```

### Listar Sites
```bash
curl -X GET http://localhost:3000/api/sites \
  -H "X-API-Key: your-api-key"
```

### Upload de Arquivos
```bash
curl -X POST http://localhost:3000/api/sites/{id}/files/upload \
  -H "X-API-Key: your-api-key" \
  -F "files=@arquivo.html"
```

## Requisitos do Sistema

- Node.js 18+
- Nginx
- MySQL/MariaDB
- WP-CLI
- Certbot (para SSL)
- Permissões sudo para configuração do Nginx

## Estrutura

```
api-site-manager/
├── src/
│   ├── controllers/    # Controladores de endpoints
│   ├── services/       # Lógica de negócio
│   ├── models/         # Modelos de dados
│   ├── utils/          # Utilitários
│   ├── config/         # Configurações
│   └── middleware/     # Middlewares
├── scripts/            # Scripts shell
└── tests/              # Testes
```

