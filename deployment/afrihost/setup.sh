#!/bin/bash

# CareerBoost Afrihost Setup Script
echo "==================================================="
echo "   CareerBoost Afrihost Setup"
echo "==================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to log messages
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    error "Please run this script from the project root directory"
    exit 1
fi

# Check Node.js
if ! command_exists node; then
    error "Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

log "Node.js version: $(node --version)"

# Check npm
if ! command_exists npm; then
    error "npm is not installed"
    exit 1
fi

log "npm version: $(npm --version)"

# Create necessary directories
log "Creating project structure..."
mkdir -p backend/src/middleware
mkdir -p backend/src/models
mkdir -p backend/src/routes
mkdir -p backend/src/services
mkdir -p backend/src/security
mkdir -p backend/src/database
mkdir -p frontend/src/components/Layout
mkdir -p frontend/src/components/Cart
mkdir -p frontend/src/pages
mkdir -p frontend/public
mkdir -p logs
mkdir -p uploads
mkdir -p deployment/afrihost

# Set permissions
log "Setting permissions..."
chmod 755 backend
chmod 755 frontend
chmod 755 uploads
chmod 644 backend/.env
chmod 644 frontend/.env

# Install dependencies
log "Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        error "Backend dependency installation failed"
        exit 1
    fi
else
    warn "Backend dependencies already installed"
fi

log "Installing frontend dependencies..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        error "Frontend dependency installation failed"
        exit 1
    fi
else
    warn "Frontend dependencies already installed"
fi

# Build frontend
log "Building frontend for production..."
npm run build
if [ $? -ne 0 ]; then
    error "Frontend build failed"
    exit 1
fi

cd ..

# Create startup script
log "Creating startup scripts..."
cat > start-careerboost.sh << 'EOF'
#!/bin/bash
# CareerBoost Startup Script for Afrihost

echo "Starting CareerBoost..."

# Check if already running
if ps aux | grep -v grep | grep "node.*server.js" > /dev/null; then
    echo "CareerBoost is already running"
    exit 1
fi

# Start backend
cd /home/$(whoami)/backend
npm start > ../logs/backend.log 2>&1 &

# Wait for backend to start
sleep 10

echo "CareerBoost started successfully!"
echo "Backend running on port 5000"
echo "Check logs: tail -f ../logs/backend.log"
EOF

chmod +x start-careerboost.sh

# Create stop script
cat > stop-careerboost.sh << 'EOF'
#!/bin/bash
# CareerBoost Stop Script for Afrihost

echo "Stopping CareerBoost..."

# Find and kill Node.js processes for CareerBoost
pkill -f "node.*server.js"

echo "CareerBoost stopped"
EOF

chmod +x stop-careerboost.sh

# Create crontab entry for auto-start
log "Setting up auto-start on boot..."
(crontab -l 2>/dev/null; echo "@reboot $(pwd)/start-careerboost.sh") | crontab -

log "==================================================="
log "   AFRIHOST SETUP COMPLETED SUCCESSFULLY!"
log "==================================================="
log ""
log "Next steps:"
log "1. Configure your domain in Afrihost cPanel"
log "2. Update backend/.env with your database details"
log "3. Update frontend/.env with your domain"
log "4. Run: ./start-careerboost.sh"
log ""
log "Access URLs:"
log "- Your Domain: https://yourdomain.co.za"
log "- Backend API: https://yourdomain.co.za/api"
log "- Health Check: https://yourdomain.co.za/api/health"
log ""
log "Management commands:"
log "- Start: ./start-careerboost.sh"
log "- Stop: ./stop-careerboost.sh"
log "- View logs: tail -f logs/backend.log"
log ""
