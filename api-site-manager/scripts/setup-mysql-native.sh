#!/bin/bash

# Script para configurar MySQL nativo para uso com a API
# Execute como root: sudo bash setup-mysql-native.sh

set -e

echo "🔧 Configurando MySQL nativo para TxunaSites API Manager..."
echo ""

# Verificar se MySQL está rodando
if ! systemctl is-active --quiet mysql && ! systemctl is-active --quiet mariadb; then
    echo "❌ MySQL/MariaDB não está rodando!"
    echo "   Inicie o MySQL: systemctl start mysql (ou mariadb)"
    exit 1
fi

echo "✅ MySQL está rodando"
echo ""

# Ler senha do root do MySQL
read -sp "Digite a senha do root do MySQL: " MYSQL_ROOT_PASS
echo ""

# Criar banco de dados
echo "📦 Criando banco de dados txuna_sites..."
mysql -u root -p"$MYSQL_ROOT_PASS" <<EOF
CREATE DATABASE IF NOT EXISTS txuna_sites CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Banco de dados criado"
else
    echo "❌ Erro ao criar banco de dados"
    exit 1
fi

# Criar usuário (opcional - pode usar root)
read -p "Deseja criar um usuário dedicado? (s/n): " CREATE_USER
if [[ $CREATE_USER =~ ^[Ss]$ ]]; then
    read -p "Nome do usuário (padrão: txuna_user): " DB_USER
    DB_USER=${DB_USER:-txuna_user}
    
    read -sp "Senha do usuário: " DB_PASS
    echo ""
    
    mysql -u root -p"$MYSQL_ROOT_PASS" <<EOF
CREATE USER IF NOT EXISTS '$DB_USER'@'%' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON txuna_sites.* TO '$DB_USER'@'%';
FLUSH PRIVILEGES;
EOF
    
    echo "✅ Usuário $DB_USER criado"
    echo ""
    echo "📝 Use estas credenciais no .env:"
    echo "   DB_USER=$DB_USER"
    echo "   DB_PASSWORD=$DB_PASS"
else
    echo "ℹ️  Usando usuário root"
    echo ""
    echo "📝 Use estas credenciais no .env:"
    echo "   DB_USER=root"
    echo "   DB_PASSWORD=<sua-senha-root>"
fi

# Executar script de inicialização
if [ -f "./scripts/init-db.sql" ]; then
    echo "📋 Executando script de inicialização..."
    mysql -u root -p"$MYSQL_ROOT_PASS" txuna_sites < ./scripts/init-db.sql
    echo "✅ Script de inicialização executado"
fi

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Edite o arquivo .env com as credenciais acima"
echo "   2. Configure DB_HOST=host.docker.internal (para container)"
echo "      ou DB_HOST=localhost (se rodar sem Docker)"
echo "   3. Execute: docker compose up -d"
echo ""

