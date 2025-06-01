#!/bin/bash

echo "🚀 MemeDici Feedback Oracle - Flow Testnet Deployment"
echo "======================================================="

# Check if we're in the contracts directory
if [ ! -f "hardhat.config.js" ]; then
    echo "❌ Please run this script from the contracts directory"
    exit 1
fi

echo "📋 Step 1: Running pre-deployment diagnostics..."
npx hardhat run scripts/check-feedback-deployment.js --network flowTestnet

# Check if diagnostics passed
if [ $? -ne 0 ]; then
    echo "❌ Diagnostics failed. Please fix the issues above before deployment."
    exit 1
fi

echo ""
read -p "🤔 Diagnostics completed. Do you want to proceed with deployment? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "🚫 Deployment cancelled by user."
    exit 0
fi

echo "📦 Step 2: Deploying Feedback Oracle to Flow Testnet..."
npx hardhat run scripts/deploy-feedback-flowtest.js --network flowTestnet

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "🔍 Next steps:"
    echo "1. Update your .env file with the new contract addresses"
    echo "2. Update the backend environment variables on Render"
    echo "3. Test the feedback system with a sample submission"
    echo ""
    echo "📚 Documentation:"
    echo "- Verification skip: Set FEEDBACK_SKIP_VERIFICATION=true for testing"
    echo "- Owner controls: Use FEEDBACK_OWNER_OVERRIDE=true for emergency access"
    echo ""
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi 