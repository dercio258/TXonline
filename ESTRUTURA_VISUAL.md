# Estrutura Visual - TxunaSites API Manager

```
TxunaSites/
│
├── api-site-manager/              # API Principal (Prioridade 1)
│   ├── server.js                  # Entry point do servidor
│   ├── package.json               # Dependências Node.js
│   ├── env.example                # Variáveis de ambiente
│   │
│   ├── src/
│   │   ├── controllers/           # Controladores (lógica HTTP)
│   │   │   ├── site.controller.js
│   │   │   ├── wordpress.controller.js
│   │   │   ├── file.controller.js
│   │   │   ├── monitoring.controller.js
│   │   │   └── subdomain.controller.js
│   │   │
│   │   ├── services/              # Lógica de negócio
│   │   │   ├── site.service.js
│   │   │   ├── wordpress.service.js
│   │   │   ├── file.service.js
│   │   │   ├── monitoring.service.js
│   │   │   └── subdomain.service.js
│   │   │
│   │   ├── routes/                # Definição de rotas
│   │   │   ├── api.routes.js      # Rota principal
│   │   │   ├── site.routes.js
│   │   │   ├── wordpress.routes.js
│   │   │   ├── file.routes.js
│   │   │   ├── monitoring.routes.js
│   │   │   └── subdomain.routes.js
│   │   │
│   │   ├── middleware/            # Middlewares
│   │   │   ├── auth.js            # Autenticação API Key
│   │   │   ├── validation.js     # Validação Joi
│   │   │   └── errorHandler.js    # Tratamento de erros
│   │   │
│   │   └── utils/
│   │       └── logger.js          # Sistema de logs (Winston)
│   │
│   ├── scripts/                    # Scripts shell auxiliares
│   │   ├── install-wordpress.sh   # Instalação WordPress
│   │   ├── create-subdomain.sh    # Criação subdomínio Nginx
│   │   └── setup-ssl.sh           # Configuração SSL
│   │
│   └── logs/                       # Logs da aplicação (gerado)
│
├── backend/                        # Backend Principal (Futuro)
│   └── (a ser desenvolvido)
│
├── frontend/                       # Frontend (Futuro)
│   └── (a ser desenvolvido)
│
├── PLANO_ESTRUTURAL.md            # Plano completo do projeto
├── DISCUSSAO_ARQUITETURA.md       # Decisões arquiteturais
├── RESUMO_PLANEJAMENTO.md         # Resumo executivo
└── ESTRUTURA_VISUAL.md            # Este arquivo
```

## Fluxo de Requisição

```
Cliente (curl/Postman)
    │
    ▼
Express Server (server.js)
    │
    ▼
Middleware: Auth (API Key)
    │
    ▼
Routes (api.routes.js)
    │
    ▼
Controller (ex: site.controller.js)
    │
    ▼
Service (ex: site.service.js)
    │
    ├──► SubdomainService (criar subdomínio)
    ├──► WordPressService (instalar WP)
    ├──► FileService (upload arquivos)
    └──► MonitoringService (verificar limites)
    │
    ▼
Resposta JSON
```

## Endpoints Principais

```
POST   /api/sites                    # Criar site
GET    /api/sites                    # Listar sites
GET    /api/sites/:id                # Detalhes do site
PUT    /api/sites/:id                # Atualizar site
DELETE /api/sites/:id                # Deletar site

POST   /api/sites/:id/wordpress/install      # Instalar WordPress
GET    /api/sites/:id/wordpress/plugins      # Listar plugins
POST   /api/sites/:id/wordpress/plugins      # Instalar plugin
DELETE /api/sites/:id/wordpress/plugins/:plugin  # Remover plugin

POST   /api/sites/:id/files/upload   # Upload arquivos
GET    /api/sites/:id/files          # Listar arquivos
DELETE /api/sites/:id/files/*        # Deletar arquivo

GET    /api/sites/:id/storage        # Uso de armazenamento
GET    /api/sites/:id/stats          # Estatísticas

POST   /api/subdomains               # Criar subdomínio
GET    /api/subdomains               # Listar subdomínios
DELETE /api/subdomains/:name         # Deletar subdomínio
```

## Integração com Sistema

```
API Site Manager
    │
    ├──► Nginx (subdomínios, proxy)
    ├──► MySQL (WordPress databases)
    ├──► WP-CLI (instalação WordPress)
    ├──► Certbot (SSL automático)
    ├──► Cloudflare API (DNS) - opcional
    └──► Sistema de arquivos (/var/www)
```

## Próximas Integrações

```
API Site Manager
    │
    ├──► Backend Principal
    │   ├──► Autenticação de usuários
    │   ├──► Metadados dos sites
    │   └──► Lógica de negócio adicional
    │
    └──► Frontend
        ├──► Dashboard de gerenciamento
        ├──► Interface de criação de sites
        └──► Monitoramento visual
```

