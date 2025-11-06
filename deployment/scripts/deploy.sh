#!/bin/bash

# CareerBoost Deployment Script
set -e

echo "🚀 Starting CareerBoost Deployment..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found"
    exit 1
fi

# Validate required environment variables
required_vars=(
    "NODE_ENV" "MONGODB_URI" "JWT_SECRET" 
    "ENCRYPTION_KEY" "OPENAI_API_KEY"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p nginx/ssl nginx/logs uploads logs backups

# Generate SSL certificates if they don't exist
if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
    echo "🔐 Generating self-signed SSL certificates (for testing)..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=CareerBoost/CN=careerboost.local"
fi

# Build and start services
echo "🐳 Building and starting Docker services..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
services=("mongodb" "redis" "backend" "frontend" "nginx")

for service in "${services[@]}"; do
    echo "Checking $service..."
    for i in {1..30}; do
        if [ "$(docker-compose ps -q $service)" ] && [ "$(docker inspect -f '{{.State.Health.Status}}' $(docker-compose ps -q $service))" == "healthy" ]; then
            echo "✅ $service is healthy"
            break
        fi
        
        if [ $i -eq 30 ]; then
            echo "❌ $service failed to become healthy"
            docker-compose logs $service
            exit 1
        fi
        
        sleep 10
    done
done

# Run database migrations
echo "🗃️ Running database migrations..."
docker-compose exec backend node scripts/migrate.js

# Create initial admin user
echo "👨‍💼 Creating initial admin user..."
docker-compose exec backend node scripts/create-admin.js

# Perform health checks
echo "🔍 Performing final health checks..."
curl -f https://localhost/api/health || exit 1
curl -f https://localhost/ || exit 1

echo "🎉 Deployment completed successfully!"
echo "📊 Access your application at: https://localhost"
echo "👁️  Owner Dashboard: https://localhost/owner"
echo "📝 Logs: docker-compose logs -f"

# Display service status
echo ""
echo "📋 Service Status:"
docker-compose ps
