# Guia Docker - TxunaSites API Manager

## 🚀 Início Rápido

### 1. Desenvolvimento Local

```bash
# Criar arquivo .env
cp env.example .env
# Editar .env com suas configurações

# Iniciar containers
docker-compose up -d

# Ver logs
docker-compose logs -f api

# Parar
docker-compose down
```

### 2. Acessar Serviços

- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **phpMyAdmin** (dev): http://localhost:8080

### 3. Comandos Úteis

```bash
# Rebuild após mudanças
docker-compose build

# Ver logs
docker-compose logs api
docker-compose logs mysql

# Entrar no container
docker-compose exec api sh

# Parar e remover volumes (limpar tudo)
docker-compose down -v
```

## 🏗️ Estrutura com Docker

### Arquitetura

```
┌─────────────────────────────────────┐
│  Host (VPS)                         │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Nginx (Host)                 │ │
│  │  - Gerencia subdomínios        │ │
│  │  - Proxy para containers       │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Docker Compose                │ │
│  │                                │ │
│  │  ┌──────────┐  ┌──────────┐  │ │
│  │  │   API    │  │  MySQL   │  │ │
│  │  └──────────┘  └──────────┘  │ │
│  │                                │ │
│  │  ┌──────────┐  ┌──────────┐  │ │
│  │  │ WordPress│  │ WordPress│  │ │
│  │  │ (site1)  │  │ (site2)  │  │ │
│  │  └──────────┘  └──────────┘  │ │
│  └───────────────────────────────┘ │
│                                     │
│  /var/www/sites/                    │
│  - Sites estáticos                  │
└─────────────────────────────────────┘
```

## 📝 Variáveis de Ambiente

Crie um arquivo `.env`:

```env
# Database
DB_PASSWORD=senha_segura_aqui
MYSQL_ROOT_PASSWORD=root_senha_aqui

# API
API_KEY=sua-api-key-secreta
MAIN_DOMAIN=txunasites.com

# WordPress
WP_ADMIN_USER=admin
WP_ADMIN_EMAIL=admin@txunasites.com
```

## 🔧 Configuração do Nginx no Host

O Nginx precisa estar no host para gerenciar subdomínios. Exemplo de configuração:

```nginx
# /etc/nginx/sites-available/txuna-api
upstream api_backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.txunasites.com;

    location / {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🐳 Criar Containers WordPress Dinamicamente

A API pode criar containers WordPress assim:

```javascript
// Exemplo em wordpress.service.js
import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

async function createWordPressContainer(siteId, subdomain) {
  const container = await docker.createContainer({
    Image: 'wordpress:latest',
    name: `wp-${subdomain}`,
    Env: [
      `WORDPRESS_DB_HOST=mysql`,
      `WORDPRESS_DB_NAME=wp_${subdomain}`,
      `WORDPRESS_DB_USER=txuna_user`,
      `WORDPRESS_DB_PASSWORD=${process.env.DB_PASSWORD}`
    ],
    HostConfig: {
      Binds: [
        `/var/www/${subdomain}:/var/www/html`
      ],
      PortBindings: {
        '80/tcp': [{ HostPort: '0' }] // Porta aleatória
      },
      Memory: 512 * 1024 * 1024, // 512MB
      CpuShares: 512
    },
    NetworkingConfig: {
      EndpointsConfig: {
        'txuna-network': {}
      }
    }
  });

  await container.start();
  return container;
}
```

## 📦 Volumes

### Volumes Nomeados (Gerenciados pelo Docker)
- `mysql_data`: Dados do MySQL
- Volumes por site WordPress (criados dinamicamente)

### Bind Mounts (Compartilhados com Host)
- `./sites:/var/www`: Sites no host (Nginx acessa)
- `./logs:/app/logs`: Logs da API
- `/var/run/docker.sock`: Acesso ao Docker daemon

## 🔒 Segurança

1. **Não exponha MySQL na internet** (remova ports em produção)
2. **Use secrets** para senhas em produção
3. **Limite recursos** dos containers WordPress
4. **Firewall** no host
5. **SSL/TLS** com Let's Encrypt

## 🚀 Deploy em Produção

### 1. Preparar VPS
```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Configurar Nginx no Host
```bash
sudo apt install nginx
# Configurar como mostrado acima
```

### 3. Deploy
```bash
git clone <repo>
cd api-site-manager
cp env.example .env
# Editar .env
docker-compose up -d
```

### 4. SSL com Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.txunasites.com
```

## 🐛 Troubleshooting

### Container não inicia
```bash
docker-compose logs api
docker-compose ps
```

### MySQL não conecta
```bash
docker-compose exec mysql mysql -u root -p
# Verificar se banco existe
```

### Permissões de arquivos
```bash
# Ajustar permissões do diretório de sites
sudo chown -R $USER:$USER ./sites
```

### Limpar tudo e recomeçar
```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

## 📚 Próximos Passos

1. ✅ API rodando em container
2. ⏳ Implementar criação dinâmica de containers WordPress
3. ⏳ Integrar com Nginx do host
4. ⏳ Sistema de backup de volumes
5. ⏳ Monitoramento com Prometheus

