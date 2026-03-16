#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "================================================="
echo "          Starting Production Setup              "
echo "================================================="


# 1. Install dependencies
echo "[1/4] Installing dependencies with Bun..."
bun install

# 2. Build the Next.js application for production
echo "[2/4] Building the Next.js application..."
bun run build

# 3. Start the server with PM2
echo "[3/4] Starting the process with PM2..."
# Delete the process if it already exists to restart it cleanly
pm2 delete invenda-frontend 2> /dev/null || true

# Start the application using Bun and PM2
pm2 start bun --name "invenda-frontend" -- run start

# 4. Save PM2 state
echo "[4/4] Saving the process list..."
pm2 save

echo ""
echo "================================================="
echo "Frontend configuration completed successfully!"
echo ""
echo "The 'invenda-frontend' process is now active in the background."
echo "-------------------------------------------------"
echo "IMPORTANT: For PM2 to start automatically with the PC,"
echo "run the command:  'pm2 startup'  and copy/paste the command it provides."
echo "================================================="
