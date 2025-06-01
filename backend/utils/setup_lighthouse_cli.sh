#!/bin/bash

# Lighthouse CLI Setup Script for Render Server
# Sets up the Lighthouse CLI with wallet, API key, and IPNS key generation

set -e  # Exit on any error

echo "🚀 Setting up Lighthouse CLI on Render server..."

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    exit 1
fi

# Step 1: Install Lighthouse CLI globally
echo "📦 Installing Lighthouse CLI globally..."
npm install -g @lighthouse-web3/sdk

# Verify installation
if ! command -v lighthouse-web3 &> /dev/null; then
    echo "❌ Lighthouse CLI installation failed"
    exit 1
fi

echo "✅ Lighthouse CLI installed successfully"

# Step 2: Create wallet
echo "🔑 Creating Lighthouse wallet..."
lighthouse-web3 create-wallet

# Step 3: Create API key with password from environment
echo "🔐 Creating API key..."

# Get password from environment variable
LIGHTHOUSE_CLI_PWD=${LIGHTHOUSE_CLI_PWD:-"default_password_123"}

# Create API key (this will prompt for password)
echo "$LIGHTHOUSE_CLI_PWD" | lighthouse-web3 api-key --new

echo "✅ API key created successfully"

# Step 4: Generate IPNS key
echo "🌐 Generating IPNS key..."
IPNS_OUTPUT=$(lighthouse-web3 ipns --generate-key)

echo "📝 IPNS Key Generation Output:"
echo "$IPNS_OUTPUT"

# Extract ipnsName and ipnsId from output
# Expected format:
# ipnsName: e66007a1b63a4abc9d81c0a06a563c88
# ipnsId: k51qzi5uqu5dlvjmca6812kimylvsgywek40hkbgqqmipgsq6gge4x2oxe0v7c

IPNS_NAME=$(echo "$IPNS_OUTPUT" | grep "ipnsName:" | awk '{print $2}' | tr -d '\n\r' | xargs)
IPNS_ID=$(echo "$IPNS_OUTPUT" | grep "ipnsId:" | awk '{print $2}' | tr -d '\n\r' | xargs)

if [ -z "$IPNS_NAME" ] || [ -z "$IPNS_ID" ]; then
    echo "❌ Failed to extract IPNS name and ID from output"
    echo "Raw output: $IPNS_OUTPUT"
    exit 1
fi

# Step 5: Save IPNS configuration to JSON file
IPNS_CONFIG_FILE="ipns_config.json"

cat > "$IPNS_CONFIG_FILE" << EOF
{
  "ipnsName": "$IPNS_NAME",
  "ipnsId": "$IPNS_ID",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "description": "MemeDici Dataset IPNS Configuration",
  "lighthouse_cli_version": "$(lighthouse-web3 --version)"
}
EOF

echo "💾 IPNS configuration saved to $IPNS_CONFIG_FILE"

# Display final results
echo ""
echo "🎉 Lighthouse CLI setup complete!"
echo "=================================="
echo "🔑 IPNS Name: $IPNS_NAME"
echo "🆔 IPNS ID: $IPNS_ID"
echo "📁 Config file: $IPNS_CONFIG_FILE"
echo ""
echo "🌐 IPNS Address will be:"
echo "   https://gateway.lighthouse.storage/ipns/$IPNS_NAME"
echo ""
echo "✅ Ready for IPNS publishing with CLI + Python SDK hybrid approach!" 