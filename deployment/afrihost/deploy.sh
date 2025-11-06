#!/bin/bash

# CareerBoost Afrihost Deployment Script
echo "==================================================="
echo "   CareerBoost Afrihost Deployment"
echo "==================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
DOMAIN="${1:-yourdomain.co.za}"
BACKEND_PORT="5000"
MYSQL_HOST="localhost"
MYSQL_DB="careerboost"
MYSQL_USER="careerboost_user"

# Generate secure keys
JWT_SECRET=$(openssl rand -base64 64)
ENCRYPTION_KEY=$(openssl rand -base64 32)
ADMIN_TOKEN=$(openssl rand -base64 32)

log "Deploying CareerBoost to domain: $DOMAIN"

# Stop existing services
log "Stopping existing services..."
pkill -f "node.*server.js" 2>/dev/null || warn "No existing services found"

# Backup existing data
if [ -d "backend" ]; then
    log "Backing up existing data..."
    tar -czf "backup-$(date +%Y%m%d-%H%M%S).tar.gz" backend/uploads backend/.env 2>/dev/null || warn "No data to backup"
fi

# Update environment configuration
log "Configuring environment..."

# Backend .env
cat > backend/.env << EOF
# CareerBoost Production Configuration
NODE_ENV=production
PORT=$BACKEND_PORT
MONGODB_URI=mongodb://$MYSQL_USER:${MYSQL_PASS}@$MYSQL_HOST/$MYSQL_DB
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
OPENAI_API_KEY=your_openai_api_key_here
FRONTEND_URL=https://$DOMAIN
REACT_APP_API_URL=https://$DOMAIN/api
BASE_URL=https://$DOMAIN

# Payment Gateways
FNB_MERCHANT_ID=your_fnb_merchant_id
FNB_MERCHANT_KEY=your_fnb_merchant_key
FNB_SECRET_KEY=your_fnb_secret_key
PAYFAST_MERCHANT_ID=your_payfast_merchant_id
PAYFAST_MERCHANT_KEY=your_payfast_merchant_key
PAYFAST_PASSPHRASE=your_payfast_passphrase

# Security
ADMIN_TOKEN=$ADMIN_TOKEN
EOF

# Frontend .env
cat > frontend/.env << EOF
VITE_API_URL=https://$DOMAIN/api
VITE_ENVIRONMENT=production
VITE_APP_NAME=CareerBoost
EOF

# Install/update dependencies
log "Installing dependencies..."
cd backend && npm install --production && cd ..
cd frontend && npm install --production && cd ..

# Build frontend
log "Building frontend..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    error "Frontend build failed"
    exit 1
fi
cd ..

# Setup public_html for Afrihost
log "Setting up public directory..."
mkdir -p public_html
cp -r frontend/dist/* public_html/

# Create .htaccess for SPA routing
cat > public_html/.htaccess << 'EOF'
RewriteEngine On

# Redirect to HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# SPA Fallback
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Security Headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

# Gzip Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>
EOF

# Setup log rotation
log "Setting up log rotation..."
cat > /etc/logrotate.d/careerboost << EOF
$(pwd)/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

# Set permissions
log "Setting permissions..."
chmod -R 755 backend
chmod -R 755 frontend
chmod -R 755 public_html
chmod -R 755 logs
chmod -R 755 uploads
chmod 600 backend/.env
chmod 600 frontend/.env

# Create database setup script
log "Creating database setup..."
cat > setup-database.sql << EOF
-- CareerBoost MySQL Database Setup
CREATE DATABASE IF NOT EXISTS $MYSQL_DB;
CREATE USER IF NOT EXISTS '$MYSQL_USER'@'localhost' IDENTIFIED BY '${MYSQL_PASS}';
GRANT ALL PRIVILEGES ON $MYSQL_DB.* TO '$MYSQL_USER'@'localhost';
FLUSH PRIVILEGES;

USE $MYSQL_DB;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(24) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    profile JSON,
    cv JSON,
    jobPreferences JSON,
    services JSON,
    popiaConsent JSON,
    marketingConsent JSON,
    statistics JSON,
    preferences JSON,
    isActive BOOLEAN DEFAULT TRUE,
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_created (createdAt)
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(24) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    company VARCHAR(100) NOT NULL,
    description TEXT,
    requirements JSON,
    responsibilities JSON,
    location VARCHAR(255),
    salaryRange JSON,
    jobType VARCHAR(50),
    experienceLevel VARCHAR(50),
    applicationUrl VARCHAR(500),
    source JSON,
    contact JSON,
    companyInfo JSON,
    isActive BOOLEAN DEFAULT TRUE,
    isVerified BOOLEAN DEFAULT FALSE,
    isFeatured BOOLEAN DEFAULT FALSE,
    isRemote BOOLEAN DEFAULT FALSE,
    filledAt TIMESTAMP NULL,
    expiresAt TIMESTAMP NULL,
    postedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scrapedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    categories JSON,
    skills JSON,
    benefits JSON,
    tags JSON,
    requirementsAnalysis JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_title (title),
    INDEX idx_company (company),
    INDEX idx_location (location),
    INDEX idx_active (isActive),
    INDEX idx_expires (expiresAt)
);
EOF

log "Database setup script created: setup-database.sql"
log "Run: mysql -u root -p < setup-database.sql"

# Start services
log "Starting CareerBoost services..."
./start-careerboost.sh

log "==================================================="
log "   DEPLOYMENT COMPLETED SUCCESSFULLY!"
log "==================================================="
log ""
log "Your CareerBoost instance is now running at:"
log "🌍 https://$DOMAIN"
log "🔧 Admin Dashboard: https://$DOMAIN/owner"
log "💾 Database: $MYSQL_DB"
log ""
log "Next steps:"
log "1. Configure your OpenAI API key in backend/.env"
log "2. Setup payment gateway credentials"
log "3. Run database setup: mysql -u root -p < setup-database.sql"
log "4. Test the application at https://$DOMAIN"
log ""
log "Management:"
log "- Start: ./start-careerboost.sh"
log "- Stop: ./stop-careerboost.sh"
log "- Logs: tail -f logs/backend.log"
log ""
