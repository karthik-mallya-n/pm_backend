#!/bin/bash
echo "Setting up your database..."

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run migrations
echo "Running migrations..."
npx prisma migrate dev --name init

echo "Database setup complete!"
