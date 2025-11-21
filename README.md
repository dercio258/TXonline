# TxunaSites - Sistema de Gerenciamento Automático de Sites

Sistema completo para criação e gerenciamento automático de sites WordPress e estáticos com Docker, SSL automático, FTP e monitoramento de recursos.

## 🚀 Funcionalidades

- ✅ **Criação Dinâmica de Sites**
  - WordPress com containers Docker isolados
  - Sites estáticos (HTML/CSS/JS)
  - Subdomínios automáticos

- ✅ **SSL Automático**
  - Instalação automática com Let's Encrypt
  - Renovação automática
  - HTTPS para todos os sites

- ✅ **Bancos de Dados Dinâmicos**
  - Criação automática de banco MySQL por site WordPress
  - Usuários dedicados por banco
  - Remoção automática ao deletar site

- ✅ **Monitoramento**
  - Uso de armazenamento em tempo real
  - Uso de RAM por container
  - Uso de CPU
  - Alertas automáticos

- ✅ **FTP para Edição Externa**
  - Usuário FTP criado automaticamente por site
  - Acesso restrito ao diretório do site
  - Credenciais via API

- ✅ **Sistema de Comunicação**
  - API para mensagens/interatividade
  - Histórico de comunicações
  - Estatísticas

## 📁 Estrutura do Projeto

```
TxunaSites/
├── api-site-manager/          # API principal
│   ├── src/                   # Código fonte
│   ├── scripts/               # Scripts auxiliares
│   ├── Dockerfile             # Container da API
│   ├── docker-compose.yml     # Orquestração
│   └── README.md              # Documentação da API
├── backend/                    # Backend principal (futuro)
├── frontend/                   # Frontend (futuro)
└── README.md                   # Este arquivo
```

## 🏗️ Arquitetura

- **API Site Manager**: Node.js + Express
- **Banco de Dados**: MySQL 8.0
- **WordPress**: Containers Docker isolados
- **Proxy Reverso**: Nginx
- **SSL**: Let's Encrypt (Certbot)
- **FTP**: vsftpd

## 🚀 Início Rápido

### 1. Clone o Repositório

```bash
git clone https://github.com/dercio258/TXonline.git
cd TXonline
```

### 2. Configure a API

```bash
cd api-site-manager
cp env.example .env
# Edite o .env com suas configurações
```

### 3. Inicie com Docker

```bash
docker-compose up -d
```

### 4. Teste a API

```bash
curl http://localhost:3000/health
```

## 📚 Documentação

- **[COMANDOS_EXTERNOS.md](api-site-manager/COMANDOS_EXTERNOS.md)** - Comandos para uso externo da API
- **[DEPLOY_MOZLOJA.md](api-site-manager/DEPLOY_MOZLOJA.md)** - Guia de deploy em produção
- **[PRODUCAO.md](api-site-manager/PRODUCAO.md)** - Configuração para produção
- **[DOCKER_GUIDE.md](api-site-manager/DOCKER_GUIDE.md)** - Guia Docker
- **[TESTES_CURL.md](api-site-manager/TESTES_CURL.md)** - Exemplos de testes

## 🔧 Configuração

### Variáveis de Ambiente Principais

```env
MAIN_DOMAIN=mozloja.online
API_DOMAIN=api.mozloja.online
API_KEY=sua-api-key-secreta
DB_PASSWORD=senha-mysql-forte
USE_SSL=true
```

## 📋 Exemplo de Uso

### Criar Site WordPress Completo

```bash
# 1. Criar site
curl -X POST https://api.mozloja.online/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "subdomain": "meusite",
    "type": "wordpress",
    "adminEmail": "admin@example.com"
  }'

# 2. Instalar WordPress
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

## 🛠️ Tecnologias

- **Backend**: Node.js 18+, Express
- **Banco de Dados**: MySQL 8.0
- **Containerização**: Docker, Docker Compose
- **WordPress**: WP-CLI, Containers Docker
- **Proxy**: Nginx
- **SSL**: Let's Encrypt (Certbot)
- **FTP**: vsftpd
- **Monitoramento**: Docker Stats API

## 📊 Status do Projeto

- ✅ API Site Manager - Completo
- ⏳ Backend Principal - Planejado
- ⏳ Frontend - Planejado

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença ISC.

## 👤 Autor

**dercio258**

- GitHub: [@dercio258](https://github.com/dercio258)
- Repositório: [TXonline](https://github.com/dercio258/TXonline)

## 🙏 Agradecimentos

- WordPress Community
- Docker Community
- Let's Encrypt

---

**⭐ Se este projeto foi útil, considere dar uma estrela!**

