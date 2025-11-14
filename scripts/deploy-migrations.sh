#!/bin/bash
# Deploy Prisma migrations to production database
# Run this script when DATABASE_URL is set to production

set -e

echo "🚀 Deploying Prisma migrations to production..."

# Generate Prisma client
npx prisma generate

# Deploy pending migrations
npx prisma migrate deploy

echo "✅ Migrations deployed successfully!"

# Verify decoration workflow tables exist
echo "🔍 Verifying decoration workflow schema..."
npx tsx scripts/check-decoration-schema.ts

echo "✅ All done!"

