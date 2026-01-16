#!/bin/bash

# Скрипт для добавления trunk provider в Asterisk Realtime БД
# Решает проблему: "No matching endpoint found" для 109.68.238.170

set -e

echo "=== Adding External Trunk Provider to Asterisk Realtime DB ==="
echo ""

# Получаем DB credentials из docker-compose.yml или .env
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-asterisk}"
DB_USER="${POSTGRES_USER:-asterisk}"
DB_PASSWORD="${POSTGRES_PASSWORD:-asterisk_password}"

# Проверяем, запущен ли контейнер Postgres
if docker compose ps postgres | grep -q "Up"; then
    echo "✓ Postgres container is running"
    
    # Выполняем SQL через docker compose exec
    echo ""
    echo "Executing SQL script..."
    docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" < add-trunk-provider.sql
    
    echo ""
    echo "✓ SQL script executed successfully"
    
    # Перезагружаем PJSIP в Asterisk
    echo ""
    echo "Reloading PJSIP in Asterisk..."
    docker compose exec asterisk asterisk -rx "pjsip reload"
    
    echo ""
    echo "✓ PJSIP reloaded"
    
    # Показываем результат
    echo ""
    echo "=== Verification ==="
    echo ""
    echo "Endpoints:"
    docker compose exec asterisk asterisk -rx "pjsip show endpoints" | grep -A 5 "trunk-provider" || echo "Endpoint not shown yet (may need to wait)"
    
    echo ""
    echo "IP Identifies:"
    docker compose exec asterisk asterisk -rx "pjsip show identifies" | grep "trunk-provider" || echo "Identify not shown yet (may need to wait)"
    
    echo ""
    echo "✓ Done! Trunk provider configured."
    echo ""
    echo "Monitor logs for incoming calls:"
    echo "  docker compose logs -f asterisk | grep -i '109.68.238.170'"
    
else
    echo "✗ Postgres container is not running"
    echo "Start services first: npm run start:services"
    exit 1
fi
