#!/bin/bash

echo "🚀 Starting Netlify deployment process..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next out

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful! Ready for deployment."
    echo "📁 Static files are in the 'out' directory"
    echo ""
    echo "Next steps:"
    echo "1. Commit changes: git add . && git commit -m 'feat: add netlify config'"
    echo "2. Push to GitHub: git push origin main"
    echo "3. Connect your GitHub repo to Netlify"
    echo "4. Or deploy directly: npx netlify deploy --prod --dir=out"
else
    echo "❌ Build failed! Please check the errors above."
    exit 1
fi 