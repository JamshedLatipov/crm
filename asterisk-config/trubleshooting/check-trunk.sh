#!/bin/bash

echo "=== Checking Trunk Provider Configuration ==="
echo ""

echo "1. Checking database records:"
sudo docker compose exec -T postgres psql -U postgres -d crm -c "SELECT * FROM ps_endpoints WHERE id='trunk-provider';"
echo ""
sudo docker compose exec -T postgres psql -U postgres -d crm -c "SELECT * FROM ps_aors WHERE id='trunk-provider';"
echo ""
sudo docker compose exec -T postgres psql -U postgres -d crm -c "SELECT * FROM ps_endpoint_id_ips WHERE endpoint='trunk-provider';"

echo ""
echo "2. Checking Asterisk endpoint:"
sudo docker compose exec asterisk asterisk -rx "pjsip show endpoint trunk-provider"

echo ""
echo "3. Checking endpoint identifiers (IP identifier should be listed):"
sudo docker compose exec asterisk asterisk -rx "pjsip show identifiers"

echo ""
echo "4. Monitoring logs for 109.68.238.170 (last 5 lines):"
sudo docker compose logs --tail=5 asterisk | grep "109.68.238.170" || echo "No recent errors!"

echo ""
echo "=== Monitoring mode (Ctrl+C to exit) ==="
echo "Waiting for incoming OPTIONS from 109.68.238.170..."
sudo docker compose logs -f asterisk | grep --line-buffered "109.68.238.170"
