#!/bin/bash

echo "🚀 Starting Packivo Deployment..."

# 1. Update backend dependencies & build
echo "📦 Building Backend..."
cd backend
npm install
npx prisma generate
# npx prisma db push # Uncomment to apply schema changes to DB on deploy
npm run build
cd ..

# 2. Update frontend dependencies & build
echo "📦 Building Frontend..."
cd tenant-app
npm install
npm run build
cd ..

# 3. Restart PM2 processes
if command -v pm2 &> /dev/null
then
    echo "🔄 Restarting applications under PM2..."
    pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
else
    echo "⚠️ PM2 not found. Please install pm2 globally (npm install -g pm2) to run processes in the background."
fi

echo "✅ Packivo Deployment Completed successfully!"
