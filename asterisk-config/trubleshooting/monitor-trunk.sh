#!/bin/bash

echo "=== Мониторинг входящих запросов от 109.68.238.170 ==="
echo "Ждем запросов... (Ctrl+C для выхода)"
echo ""

sudo docker compose logs -f --tail=0 asterisk | grep --line-buffered "109.68.238.170" | while read line; do
    echo "[$(date '+%H:%M:%S')] $line"
    
    # Если видим успешный запрос (не "failed"), выделяем зеленым
    if echo "$line" | grep -q -v "failed"; then
        echo "✓ УСПЕХ: Запрос обработан!" 
    else
        echo "✗ Ошибка: No matching endpoint found"
    fi
    echo ""
done
