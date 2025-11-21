# Configuração MySQL - Porta Alternativa

## 🎯 Situação

Você tem MySQL nativo rodando na porta **3306** (para outros sites WordPress) e precisa do MySQL do container na porta **3307**.

## ✅ Configuração Atual

O `docker-compose.yml` está configurado para:
- **Porta no host**: `3307` (evita conflito)
- **Porta no container**: `3306` (padrão MySQL)
- **Mapeamento**: `3307:3306`

## 🚀 Como Usar

### 1. Configurar .env

```bash
cd /var/www/mozloja.online/api-site-manager
nano .env
```

Configurar:
```env
# Database
DB_HOST=mysql
DB_PORT=3306
DB_USER=txuna_user
DB_PASSWORD=sua_senha_forte
DB_NAME=txuna_sites
MYSQL_ROOT_PASSWORD=senha_root_forte

# Gerar senhas:
# openssl rand -base64 16
```

### 2. Iniciar Containers

```bash
docker compose up -d
```

### 3. Verificar

```bash
# Ver status
docker compose ps

# Ver logs
docker compose logs mysql

# Testar conexão (do host)
mysql -h 127.0.0.1 -P 3307 -u txuna_user -p
```

## 📊 Portas em Uso

| Serviço | Porta Host | Porta Container | Descrição |
|---------|------------|-----------------|-----------|
| MySQL Nativo | 3306 | - | Sites WordPress existentes |
| MySQL Container | 3307 | 3306 | TxunaSites API |
| API | 3000 | 3000 | API Site Manager |
| phpMyAdmin | 8080 | 80 | (opcional, dev) |

## 🔧 Conectar ao MySQL do Container

### Do Host (Servidor)

```bash
# Usar porta 3307
mysql -h 127.0.0.1 -P 3307 -u txuna_user -p
# ou
mysql -h localhost -P 3307 -u root -p
```

### Do Container da API

```bash
# Usar hostname 'mysql' (rede Docker)
mysql -h mysql -u txuna_user -p
```

### De Aplicações Externas

```bash
# Host: IP_DO_SERVIDOR
# Porta: 3307
# Usuário: txuna_user
# Senha: (do .env)
```

## 🔒 Segurança

### Permitir Acesso Remoto (Opcional)

Se precisar acessar o MySQL do container de fora do servidor:

```bash
# Editar docker-compose.yml e adicionar:
ports:
  - "0.0.0.0:3307:3306"  # Expõe para todas as interfaces

# Ou apenas localhost (mais seguro):
ports:
  - "127.0.0.1:3307:3306"  # Apenas localhost
```

### Firewall

```bash
# Se precisar acesso externo (não recomendado)
ufw allow 3307/tcp

# Ou apenas localhost (recomendado)
# Não precisa abrir porta, já está acessível via localhost
```

## 🆘 Troubleshooting

### Erro: "address already in use"

```bash
# Verificar se porta 3307 está livre
netstat -tlnp | grep 3307
# ou
lsof -i :3307

# Se estiver em uso, mudar para outra porta no docker-compose.yml
ports:
  - "3308:3306"  # Usar 3308
```

### Container MySQL não inicia

```bash
# Ver logs
docker compose logs mysql

# Verificar variáveis
docker compose config | grep MYSQL

# Verificar se volume existe
docker volume ls | grep mysql
```

### Não consegue conectar

```bash
# Verificar se container está rodando
docker compose ps mysql

# Testar conexão do container
docker compose exec mysql mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT 1"

# Verificar rede Docker
docker network inspect api-site-manager_txuna-network
```

## 📝 Notas Importantes

1. **MySQL Nativo (3306)**: Continue usando normalmente para seus sites WordPress existentes
2. **MySQL Container (3307)**: Usado apenas pela API TxunaSites
3. **Isolamento**: Cada MySQL é independente, não interfere no outro
4. **Backup**: Faça backup de ambos separadamente

## 🔄 Alternativa: Usar MySQL Nativo

Se preferir usar o MySQL nativo (sem container):

1. Comentar seção `mysql:` no `docker-compose.yml`
2. Configurar `.env` com `DB_HOST=host.docker.internal`
3. Criar banco `txuna_sites` no MySQL nativo
4. Ver script: `scripts/setup-mysql-native.sh`

---

**Status**: Configurado para usar porta 3307, sem conflito com MySQL nativo! ✅

