# 🔧 Corrigir Banco de Dados - Erro "Unknown column 'type'"

## 🔴 Problema

Erro ao criar site:
```
{"error":{"message":"Unknown column 'type' in 'field list'"}}
```

A tabela `sites` no banco de dados não tem a coluna `type` (e possivelmente outras colunas).

---

## ✅ Solução Rápida

### Opção 1: Executar migração via script

```bash
cd /var/www/mozloja.online/api-site-manager

# Tornar script executável
chmod +x scripts/fix-database.sh

# Executar migração
bash scripts/fix-database.sh
```

### Opção 2: Executar SQL manualmente

```bash
cd /var/www/mozloja.online/api-site-manager

# Conectar ao MySQL
docker compose exec mysql mysql -u txuna_user -p$DB_PASSWORD txuna_sites

# Executar comandos SQL:
```

```sql
USE txuna_sites;

-- Adicionar coluna 'type' se não existir
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS type ENUM('wordpress', 'static') NOT NULL DEFAULT 'static';

-- Adicionar outras colunas se não existirem
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS storage_limit BIGINT DEFAULT 1073741824;

ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS storage_used BIGINT DEFAULT 0;

ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS status ENUM('active', 'suspended', 'deleted') DEFAULT 'active';

-- Verificar estrutura
DESCRIBE sites;

EXIT;
```

### Opção 3: Recriar tabela (CUIDADO: apaga dados existentes!)

```bash
cd /var/www/mozloja.online/api-site-manager

# Fazer backup primeiro!
docker compose exec mysql mysqldump -u txuna_user -p$DB_PASSWORD txuna_sites sites > sites_backup.sql

# Recriar tabela
docker compose exec mysql mysql -u txuna_user -p$DB_PASSWORD txuna_sites < scripts/init-db.sql
```

---

## 🧪 Verificar Estrutura

Após corrigir, verificar:

```bash
docker compose exec mysql mysql -u txuna_user -p$DB_PASSWORD txuna_sites -e "DESCRIBE sites;"
```

**Deve mostrar:**
```
+---------------+----------------------------------------+------+-----+---------+-------+
| Field         | Type                                   | Null | Key | Default | Extra |
+---------------+----------------------------------------+------+-----+---------+-------+
| id            | varchar(50)                            | NO   | PRI | NULL    |       |
| subdomain     | varchar(100)                           | NO   | UNI | NULL    |       |
| type          | enum('wordpress','static')              | NO   |     | static  |       |
| path          | varchar(255)                           | NO   |     | NULL    |       |
| storage_limit | bigint                                 | YES  |     | 1073741824 |     |
| storage_used  | bigint                                 | YES  |     | 0       |       |
| status        | enum('active','suspended','deleted')   | YES  |     | active  |       |
| created_at    | timestamp                              | YES  |     | CURRENT_TIMESTAMP |       |
| updated_at    | timestamp                              | YES  |     | CURRENT_TIMESTAMP |       |
+---------------+----------------------------------------+------+-----+---------+-------+
```

---

## 🔄 Após Corrigir

### 1. Limpar diretório de teste

```bash
# Remover diretório vazio criado
rm -rf /var/www/testei
```

### 2. Testar criação de site novamente

```bash
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "subdomain": "teste-corrigido",
    "type": "static"
  }'
```

### 3. Verificar se foi criado corretamente

```bash
# Ver diretório
ls -la /var/www/teste-corrigido/

# Ver index.html
cat /var/www/teste-corrigido/index.html

# Verificar no banco
docker compose exec mysql mysql -u txuna_user -p$DB_PASSWORD txuna_sites -e "SELECT subdomain, type, status FROM sites WHERE subdomain='teste-corrigido';"
```

---

## 📝 SQL Completo de Migração

Se preferir executar tudo de uma vez:

```sql
USE txuna_sites;

-- Adicionar todas as colunas necessárias
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS type ENUM('wordpress', 'static') NOT NULL DEFAULT 'static',
ADD COLUMN IF NOT EXISTS storage_limit BIGINT DEFAULT 1073741824,
ADD COLUMN IF NOT EXISTS storage_used BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS status ENUM('active', 'suspended', 'deleted') DEFAULT 'active';

-- Verificar
DESCRIBE sites;
```

**Nota**: MySQL não suporta `IF NOT EXISTS` em `ALTER TABLE`. Use o script de migração ou execute manualmente verificando antes.

---

## 🐛 Troubleshooting

### Erro: "Column 'type' already exists"

A coluna já existe, mas pode estar com tipo diferente. Verificar:

```sql
DESCRIBE sites;
```

### Erro: "Table 'sites' doesn't exist"

A tabela não existe. Criar:

```bash
docker compose exec mysql mysql -u txuna_user -p$DB_PASSWORD txuna_sites < scripts/init-db.sql
```

### Erro de permissão

Verificar se usuário tem permissão para ALTER TABLE:

```sql
SHOW GRANTS FOR 'txuna_user'@'%';
```

---

**Execute a correção e teste novamente!** ✅

