#!/bin/bash

# System monitoring script for load testing
# Run this in a separate terminal during k6 tests

echo "=== CRM Load Testing - System Monitor ==="
echo "Monitoring CPU, Memory, Disk, and Network usage"
echo "Press Ctrl+C to stop monitoring"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to get CPU usage
get_cpu() {
    echo "$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')"
}

# Function to get memory usage
get_memory() {
    free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2 }'
}

# Function to get disk usage
get_disk() {
    df / | awk 'NR==2{printf "%.1f%%", $5}'
}

# Function to check if services are running
check_services() {
    local services=("node" "postgres" "redis" "rabbitmq")
    local running=""
    for service in "${services[@]}"; do
        if pgrep -f "$service" > /dev/null; then
            running="${running}${GREEN}${service}${NC} "
        else
            running="${running}${RED}${service}${NC} "
        fi
    done
    echo "$running"
}

# Function to get network connections
get_connections() {
    netstat -tun | grep ESTABLISHED | wc -l
}

# Function to get Docker container status
get_docker_status() {
    if command -v docker &> /dev/null; then
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(crm|postgres|redis|rabbitmq)" | wc -l
    else
        echo "N/A"
    fi
}

echo "Timestamp | CPU | Memory | Disk | Connections | Services | Docker Containers"
echo "----------|-----|--------|------|------------|----------|------------------"

while true; do
    timestamp=$(date '+%H:%M:%S')
    cpu=$(get_cpu)
    memory=$(get_memory)
    disk=$(get_disk)
    connections=$(get_connections)
    services=$(check_services)
    docker_count=$(get_docker_status)

    printf "%s | %s | %s | %s | %4d | %s | %s\n" \
           "$timestamp" "$cpu" "$memory" "$disk" "$connections" "$services" "$docker_count"

    sleep 5
done