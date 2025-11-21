# Discussão de Arquitetura - TxunaSites API Manager

## 📋 Status Atual

Estrutura básica criada com:
- ✅ Servidor Express configurado
- ✅ Rotas e controllers estruturados
- ✅ Services com lógica básica
- ✅ Middleware de autenticação e validação
- ✅ Sistema de logging
- ✅ Scripts auxiliares (shell)

## 🤔 Decisões Arquiteturais Pendentes

### 1. **Banco de Dados**

**Opções:**
- **MySQL/MariaDB**: Já será usado para WordPress, pode ser usado para metadados também
- **PostgreSQL**: Mais robusto, mas adiciona complexidade
- **SQLite**: Simples para começar, fácil migração depois
- **MongoDB**: Mais flexível, mas diferente do stack atual

**Recomendação**: Começar com **MySQL** (já está no stack) para manter consistência.

**Estrutura proposta:**
```sql
CREATE TABLE sites (
    id VARCHAR(50) PRIMARY KEY,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    type ENUM('wordpress', 'static') NOT NULL,
    path VARCHAR(255) NOT NULL,
    storage_limit BIGINT DEFAULT 1073741824, -- 1GB em bytes
    status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE wordpress_installs (
    site_id VARCHAR(50) PRIMARY KEY,
    version VARCHAR(20),
    db_name VARCHAR(100),
    admin_user VARCHAR(50),
    admin_email VARCHAR(255),
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id)
);

CREATE TABLE site_credentials (
    site_id VARCHAR(50) PRIMARY KEY,
    wp_admin_user VARCHAR(50),
    wp_admin_password_encrypted TEXT,
    db_password_encrypted TEXT,
    FOREIGN KEY (site_id) REFERENCES sites(id)
);
```

### 2. **Autenticação**

**Opções:**
- **API Key simples**: Implementado atualmente, fácil de usar
- **JWT**: Mais seguro, permite expiração e refresh tokens
- **OAuth2**: Mais complexo, mas padrão da indústria

**Recomendação**: Manter **API Key** inicialmente, adicionar **JWT** quando integrar com backend principal.

### 3. **Isolamento de Sites**

**Opções:**
- **Diretórios separados**: Simples, mas menos seguro
- **Docker containers**: Isolamento completo, mais complexo
- **chroot/jail**: Meio termo, bom isolamento

**Recomendação**: Começar com **diretórios separados**, planejar migração para **Docker** no futuro.

### 4. **Gerenciamento de DNS**

**Opções:**
- **Manual**: Configurar DNS manualmente
- **Cloudflare API**: Automático, muito comum
- **AWS Route53**: Se usar AWS
- **DigitalOcean DNS**: Se usar DigitalOcean

**Recomendação**: Implementar suporte para **Cloudflare API** (mais comum) e manter opção manual.

### 5. **SSL/TLS**

**Opções:**
- **Let's Encrypt (Certbot)**: Gratuito, automático
- **Cloudflare SSL**: Se usar Cloudflare
- **Manual**: Para casos especiais

**Recomendação**: **Let's Encrypt com Certbot** como padrão.

### 6. **Comunicação Dinâmica/Interatividade**

**Para páginas estáticas terem comunicação dinâmica:**

**Opções:**
- **WebSockets**: Comunicação bidirecional em tempo real
- **Server-Sent Events (SSE)**: Push do servidor para cliente
- **REST API + Polling**: Simples, mas menos eficiente
- **WebRTC**: Para comunicação P2P

**Recomendação**: Implementar **REST API** inicialmente, adicionar **WebSockets** para funcionalidades em tempo real.

**Estrutura proposta:**
```
/api/sites/:id/communication/
  - POST /message - Enviar mensagem
  - GET /messages - Receber mensagens
  - WebSocket /ws - Conexão em tempo real
```

### 7. **Sistema de Limites**

**Implementar:**
- ✅ Limite de armazenamento por site
- ✅ Limite de tamanho de upload
- ✅ Whitelist/Blacklist de plugins WordPress
- ⏳ Limite de requisições por site
- ⏳ Limite de banco de dados
- ⏳ Limite de CPU/memória (com Docker)

### 8. **Monitoramento**

**Métricas a coletar:**
- Uso de armazenamento
- Uso de banco de dados
- Tráfego (requests)
- Uptime
- Performance (tempo de resposta)

**Ferramentas:**
- **Prometheus + Grafana**: Completo, mas complexo
- **Custom dashboard**: Simples, específico
- **Logs estruturados**: Já implementado com Winston

**Recomendação**: Começar com **logs estruturados** e **endpoints de métricas**, evoluir para dashboard depois.

## 🚀 Próximos Passos de Implementação

### Fase 1: Funcionalidades Básicas (Atual)
- [x] Estrutura do projeto
- [x] Rotas e controllers básicos
- [ ] Integração com banco de dados
- [ ] Implementar criação de subdomínios (Nginx)
- [ ] Implementar instalação WordPress básica

### Fase 2: Funcionalidades Core
- [ ] Upload de arquivos funcionando
- [ ] Monitoramento de armazenamento
- [ ] Sistema de limites
- [ ] SSL automático (Let's Encrypt)
- [ ] Gerenciamento de plugins WordPress

### Fase 3: Integração e Segurança
- [ ] Integração com Cloudflare API (DNS)
- [ ] Sistema de autenticação robusto
- [ ] Backup automático
- [ ] Logs estruturados e análise
- [ ] Rate limiting por site

### Fase 4: Comunicação Dinâmica
- [ ] API de comunicação para páginas estáticas
- [ ] WebSocket server
- [ ] Sistema de mensagens/notificações
- [ ] Dashboard de interatividade

### Fase 5: Otimização
- [ ] Cache de requisições
- [ ] CDN integration
- [ ] Otimização de performance
- [ ] Docker containers para isolamento

## 📝 Perguntas para Discussão

1. **Qual o domínio principal?** (ex: txunasites.com)
2. **Onde será hospedada a VPS?** (DigitalOcean, AWS, etc.)
3. **Qual o limite padrão de armazenamento por site?**
4. **Quais plugins WordPress devem estar na whitelist/blacklist?**
5. **Como será a comunicação dinâmica?** (chat, formulários, etc.)
6. **Precisa de backup automático?** Qual frequência?
7. **Quantos sites simultâneos espera gerenciar?**
8. **Precisa de suporte multi-idioma?** (WordPress já tem)

## 🔧 Configuração da VPS

### Requisitos Mínimos:
- Ubuntu 20.04+ ou Debian 11+
- 2GB RAM (mínimo)
- 20GB SSD (mínimo)
- Node.js 18+
- Nginx
- MySQL/MariaDB
- PHP 8.1+ (para WordPress)
- WP-CLI
- Certbot

### Comandos de Setup:
```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Nginx
sudo apt-get install -y nginx

# Instalar MySQL
sudo apt-get install -y mysql-server

# Instalar PHP e extensões
sudo apt-get install -y php8.1-fpm php8.1-mysql php8.1-xml php8.1-curl

# Instalar WP-CLI
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar
sudo mv wp-cli.phar /usr/local/bin/wp

# Instalar Certbot
sudo apt-get install -y certbot python3-certbot-nginx
```

## 📚 Recursos Úteis

- [WP-CLI Documentation](https://wp-cli.org/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Cloudflare API](https://developers.cloudflare.com/api/)

