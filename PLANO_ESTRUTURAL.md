# Plano Estrutural - TxunaSites

## Visão Geral
Sistema para criação e gerenciamento automático de sites com suporte a WordPress e páginas estáticas.

## Componentes do Sistema

### 1. API Site Manager (Prioridade 1 - Desenvolvimento Inicial)
Responsável por todas as operações de infraestrutura e gerenciamento de sites.

#### Funcionalidades Principais:
- **Gerenciamento de Subdomínios**
  - Criar subdomínios dinamicamente
  - Configurar DNS automaticamente
  - Gerenciar certificados SSL/TLS
  
- **Instalação e Configuração WordPress**
  - Instalação automática do WordPress
  - Configuração de credenciais (DB, admin)
  - Configuração inicial (themes, plugins básicos)
  
- **Gerenciamento de Arquivos Estáticos**
  - Upload e deploy de páginas HTML/CSS/JS
  - Organização de arquivos por site
  - Versionamento básico
  
- **Monitoramento e Limites**
  - Monitoramento de uso de armazenamento por site
  - Limitação de uploads
  - Controle de instalação de plugins
  - Quotas de recursos
  
- **Comunicação e Interatividade**
  - API para comunicação dinâmica entre páginas
  - Sistema de educação/interatividade nas páginas

---

## Arquitetura Proposta - API Site Manager

### Estrutura de Diretórios
```
api-site-manager/
├── src/
│   ├── controllers/          # Controladores de endpoints
│   │   ├── site.controller.js
│   │   ├── wordpress.controller.js
│   │   ├── storage.controller.js
│   │   └── monitoring.controller.js
│   ├── services/            # Lógica de negócio
│   │   ├── subdomain.service.js
│   │   ├── wordpress.service.js
│   │   ├── file.service.js
│   │   ├── storage.service.js
│   │   └── dns.service.js
│   ├── models/              # Modelos de dados
│   │   └── site.model.js
│   ├── utils/               # Utilitários
│   │   ├── logger.js
│   │   ├── validator.js
│   │   └── executor.js      # Execução de comandos shell
│   ├── config/              # Configurações
│   │   ├── database.js
│   │   ├── nginx.js
│   │   └── wordpress.js
│   └── middleware/          # Middlewares
│       ├── auth.js
│       └── validation.js
├── scripts/                 # Scripts auxiliares
│   ├── install-wordpress.sh
│   ├── create-subdomain.sh
│   └── setup-ssl.sh
├── tests/                   # Testes
├── .env.example
├── package.json
├── README.md
└── server.js                # Entry point
```

### Stack Tecnológica Proposta

**Backend:**
- Node.js + Express (API REST)
- Shell scripts (Bash) para operações de sistema
- Nginx (proxy reverso e gerenciamento de subdomínios)
- MySQL/MariaDB (para WordPress e metadados)
- Certbot (SSL automático)

**Ferramentas de Sistema:**
- WP-CLI (instalação e gerenciamento WordPress)
- Docker (opcional, para isolamento)
- Git (versionamento de arquivos)

---

## Endpoints da API (Proposta Inicial)

### Sites
- `POST /api/sites` - Criar novo site
- `GET /api/sites` - Listar sites
- `GET /api/sites/:id` - Detalhes do site
- `DELETE /api/sites/:id` - Deletar site
- `PUT /api/sites/:id` - Atualizar configurações

### WordPress
- `POST /api/sites/:id/wordpress/install` - Instalar WordPress
- `POST /api/sites/:id/wordpress/plugins` - Instalar plugin (com validação)
- `GET /api/sites/:id/wordpress/plugins` - Listar plugins
- `DELETE /api/sites/:id/wordpress/plugins/:plugin` - Remover plugin
- `GET /api/sites/:id/wordpress/credentials` - Obter credenciais

### Arquivos Estáticos
- `POST /api/sites/:id/files/upload` - Upload de arquivos
- `GET /api/sites/:id/files` - Listar arquivos
- `DELETE /api/sites/:id/files/:path` - Deletar arquivo
- `POST /api/sites/:id/files/deploy` - Fazer deploy

### Monitoramento
- `GET /api/sites/:id/storage` - Uso de armazenamento
- `GET /api/sites/:id/stats` - Estatísticas gerais
- `GET /api/monitoring/all` - Monitoramento global

### Subdomínios
- `POST /api/subdomains` - Criar subdomínio
- `GET /api/subdomains` - Listar subdomínios
- `DELETE /api/subdomains/:name` - Remover subdomínio

---

## Fluxo de Criação de Site

1. **Receber comando** via API
2. **Criar subdomínio** (configurar DNS e Nginx)
3. **Criar diretório** para o site
4. **Instalar WordPress** (se solicitado)
   - Criar banco de dados
   - Baixar WordPress
   - Configurar wp-config.php
   - Criar usuário admin
5. **Configurar SSL** (Let's Encrypt)
6. **Upload de arquivos** (se houver)
7. **Retornar credenciais** e informações do site

---

## Segurança e Limites

- Autenticação via API Key ou JWT
- Validação de limites de armazenamento antes de uploads
- Whitelist/Blacklist de plugins WordPress
- Rate limiting nos endpoints
- Sanitização de inputs
- Isolamento de processos (Docker ou chroot)

---

## Integração Futura com Backend

A API Site Manager será consumida pelo Backend principal, que:
- Gerenciará usuários e autenticação
- Manterá metadados no banco de dados principal
- Fornecerá interface de gerenciamento
- Implementará lógica de negócio adicional

---

## Próximos Passos

1. ✅ Criar estrutura básica do projeto
2. ⏳ Implementar endpoints básicos (criar site, listar)
3. ⏳ Implementar criação de subdomínios
4. ⏳ Implementar instalação WordPress
5. ⏳ Implementar upload de arquivos
6. ⏳ Implementar monitoramento
7. ⏳ Implementar limites e validações
8. ⏳ Testes com curl
9. ⏳ Deploy na VPS

---

## Questões para Discussão

1. **Autenticação**: Como será a autenticação inicial? API Key simples ou JWT?
2. **Banco de Dados**: Onde armazenar metadados dos sites? MySQL separado ou integrado?
3. **Isolamento**: Usar Docker para isolar cada site ou diretórios separados?
4. **SSL**: Automático com Let's Encrypt ou manual?
5. **Backup**: Sistema de backup automático?
6. **Logs**: Como gerenciar logs de cada site?
7. **Comunicação Dinâmica**: Qual tecnologia para interatividade? WebSockets? Server-Sent Events?

