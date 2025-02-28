#!/bin/bash
# set_ips.sh
# This script retrieves the IP addresses for the mongo, redis, and nginx containers
# and updates the .env files accordingly.

# Wait briefly to ensure containers are running.
sleep 5

# Get IP addresses using docker inspect.
MONGO_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mongo)
REDIS_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' redis)
NGINX_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' nginx)

# Check that we got values.
if [ -z "$MONGO_IP" ] || [ -z "$REDIS_IP" ] || [ -z "$NGINX_IP" ]; then
  echo "Error: Could not determine one or more container IP addresses."
  exit 1
fi

echo "Detected IP addresses:"
echo "MONGO_IP: $MONGO_IP"
echo "REDIS_IP: $REDIS_IP"
echo "NGINX_IP: $NGINX_IP"

# Update backend/.env.prod (replace placeholders)
sed -i "s|<cloudlab-mongo-ip>|${MONGO_IP}|g" backend/.env.prod
sed -i "s|<cloudlab-redis-ip>|${REDIS_IP}|g" backend/.env.prod

# Update frontend/.env.prod (replace placeholder for API URL)
sed -i "s|<cloudlab-nginx-ip>|${NGINX_IP}|g" frontend/.env.prod

echo "Updated .env files with detected IP addresses."
