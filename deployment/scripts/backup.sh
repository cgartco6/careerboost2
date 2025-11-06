#!/bin/bash

# CareerBoost Backup Script
set -e

echo "💾 Starting CareerBoost Backup..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="careerboost_backup_$TIMESTAMP"

mkdir -p $BACKUP_DIR

echo "📦 Creating backup: $BACKUP_NAME"

# Backup MongoDB
echo "🗃️  Backing up MongoDB..."
docker-compose exec mongodb mongodump \
    --username=$MONGO_ROOT_USERNAME \
    --password=$MONGO_ROOT_PASSWORD \
    --authenticationDatabase=admin \
    --db=careerboost \
    --archive=/tmp/mongo_backup.archive

docker-compose cp mongodb:/tmp/mongo_backup.archive $BACKUP_DIR/mongo_$BACKUP_NAME.archive

# Backup Redis
echo "🔴 Backing up Redis..."
docker-compose exec redis redis-cli --rdb /tmp/dump.rdb
docker-compose cp redis:/tmp/dump.rdb $BACKUP_DIR/redis_$BACKUP_NAME.rdb

# Backup uploads and logs
echo "📁 Backing up uploads and logs..."
tar -czf $BACKUP_DIR/files_$BACKUP_NAME.tar.gz uploads/ logs/

# Create backup manifest
cat > $BACKUP_DIR/manifest_$BACKUP_NAME.json << EOF
{
    "backup_name": "$BACKUP_NAME",
    "timestamp": "$(date -Iseconds)",
    "components": {
        "mongodb": "mongo_$BACKUP_NAME.archive",
        "redis": "redis_$BACKUP_NAME.rdb",
        "files": "files_$BACKUP_NAME.tar.gz"
    },
    "size": {
        "mongodb": "$(du -h $BACKUP_DIR/mongo_$BACKUP_NAME.archive | cut -f1)",
        "redis": "$(du -h $BACKUP_DIR/redis_$BACKUP_NAME.rdb | cut -f1)",
        "files": "$(du -h $BACKUP_DIR/files_$BACKUP_NAME.tar.gz | cut -f1)"
    }
}
EOF

# Cleanup temporary files in containers
docker-compose exec mongodb rm -f /tmp/mongo_backup.archive
docker-compose exec redis rm -f /tmp/dump.rdb

echo "✅ Backup completed: $BACKUP_DIR/$BACKUP_NAME"
echo "📊 Backup sizes:"
du -h $BACKUP_DIR/*$BACKUP_NAME*

# Rotate old backups (keep last 7 days)
find $BACKUP_DIR -name "careerboost_backup_*" -type f -mtime +7 -delete

echo "♻️  Old backups rotated (keeping last 7 days)"
