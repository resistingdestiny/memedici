# 🚀 Netlify Deployment Guide for Memedici

This guide will help you deploy your Memedici project to Netlify with the complete Create Agent Wizard and API integration.

## 📋 Prerequisites

- GitHub account
- Netlify account (free tier works great)
- Node.js 18+ installed locally

## 🔧 Project Configuration

The project has been configured for Netlify deployment with:

✅ **Static Export**: Next.js configured for static site generation  
✅ **Build Optimization**: Webpack optimizations for production  
✅ **API Integration**: Direct connection to Memedici backend  
✅ **Security Headers**: Production-ready security configuration  

## 🚀 Deployment Options

### Option 1: GitHub Integration (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "feat: add netlify deployment config"
   git push origin main
   ```

2. **Connect to Netlify**:
   - Go to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Choose GitHub and select your repository
   - **Build settings**:
     - Build command: `cd front-end && npm run build`
     - Publish directory: `front-end/out`
     - Node version: `18`

3. **Deploy**: Netlify will automatically build and deploy your site!

### Option 2: Direct Deployment

```bash
# Build the project
cd front-end
npm run build

# Deploy with Netlify CLI
npx netlify deploy --prod --dir=out
```

## 🌍 Environment Variables

No environment variables are required! The app connects directly to:
- **Memedici API**: `https://memedici-backend.onrender.com`
- **Frontend Features**: All running client-side

## 📁 File Structure After Build

```
front-end/out/          # Static site files
├── index.html          # Homepage
├── agents/             # Agent marketplace
├── city/               # 3D city experience  
├── dashboard/          # User dashboard
├── marketplace/        # NFT marketplace
├── studio/             # Creation tools
└── _next/              # Next.js assets
```

## ⚡ Performance Optimizations

- **Static Generation**: All pages pre-rendered for fast loading
- **Image Optimization**: Optimized images with Next.js Image component
- **Bundle Splitting**: Automatic code splitting for optimal performance
- **Caching**: Browser caching configured for static assets

## 🔧 Build Configuration

Key files configured for deployment:

- **`netlify.toml`**: Netlify-specific configuration
- **`next.config.mjs`**: Next.js static export settings
- **`package.json`**: Build scripts and dependencies

## 🎯 Features Deployed

✅ **5-Step Create Agent Wizard** with form validation  
✅ **Real-time API integration** with Memedici backend  
✅ **Responsive design** for all devices  
✅ **3D city visualization** with Three.js  
✅ **Wallet integration** with RainbowKit  
✅ **Agent marketplace** with search and filtering  

## 🐛 Troubleshooting

### Build Fails
- Check Node.js version (requires 18+)
- Run `npm install` to ensure dependencies are installed
- Check for TypeScript errors (currently disabled for faster builds)

### Deployment Issues
- Verify `netlify.toml` is in the project root
- Check build command points to correct directory
- Ensure publish directory is set to `front-end/out`

### API Connection
- The app connects to the production Memedici API
- No additional backend setup required
- CORS is already configured on the backend

## 📈 Performance Metrics

Expected Lighthouse scores:
- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 100
- **SEO**: 95+

## 🚀 Production URL

Once deployed, your site will be available at:
- **Netlify URL**: `https://[site-name].netlify.app`
- **Custom Domain**: Configure in Netlify dashboard

## 🔄 Continuous Deployment

With GitHub integration:
- **Auto-deploys** on every push to main branch
- **Deploy previews** for pull requests
- **Rollback capability** to previous deployments

---

**Need help?** Check the Netlify documentation or create an issue in this repository.

🎉 **Your Memedici platform is ready for the world!** 