# Medici City - Developer Guide

This document provides an overview of the Medici City platform architecture, setup instructions, and guidelines for future development.

## Project Overview

Medici City is a multi-layer platform for AI creators, featuring:

1. **Dashboard Layer** - Web app for browsing AI creators, building prompts, and staking
2. **City Layer** - 3D third-person explorable environment 
3. **Gallery Layer** - First-person gallery experience

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **3D Rendering**: Three.js with React Three Fiber
- **State Management**: Zustand
- **UI Components**: shadcn/ui
- **Testing**: Playwright

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Modern browser with WebGL support

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Architecture

### Key Directories

- `/app` - Next.js app router pages
- `/components` - React components
  - `/components/dashboard` - Dashboard UI components
  - `/components/three-scene` - Three.js scenes and 3D components 
  - `/components/ui` - shadcn UI components
- `/lib` - Utilities and state management
  - `/lib/stores` - Zustand stores
  - `/lib/stubs.ts` - Mock API functions 

### State Management

The application uses Zustand for state management with several stores:

- `useWallet` - Wallet connection and balance state
- `useAgents` - AI creator agents data and loading state
- `useCity` - 3D city buildings and navigation state

## Contract Integration Points

The following areas are designed for blockchain integration:

1. **Wallet Connection** - `useWallet` store in `/lib/stores/use-wallet.ts`
   - Replace mock implementation with actual wallet connection logic

2. **Agent Staking** - `stake` function in `/lib/stubs.ts` 
   - Connect to staking contract

3. **Prompt Creation** - `sendPrompt` function in `/lib/stubs.ts`
   - Replace with contract calls for on-chain prompt recording

4. **Artwork Purchases** - `buyArtwork` function in `/lib/stubs.ts`
   - Implement NFT minting/transfer functionality

## Three.js Integration

The 3D scenes are built with React Three Fiber:

- `CityScene` - Third-person explorable city environment
- `GalleryScene` - First-person gallery experience

### WebGL Support

The application includes a `WebGLCheck` component that detects WebGL support and provides a fallback for unsupported browsers.

## Testing

Run Playwright tests:

```bash
npm test
```

The main test flow verifies:
1. Dashboard access
2. Agent browsing and selection
3. Sending prompts (using stub functions)

## Deployment

The application is configured for static exports with Next.js:

```bash
npm run build
```

Output will be in the `/out` directory and can be deployed to any static hosting service.

## Future Development

### Priorities

1. Replace stub functions with actual blockchain interactions
2. Expand the city with more buildings and interactive elements
3. Add more gallery customization options
4. Implement user profiles and collections
5. Add social features for sharing and collaboration

### Performance Considerations

- The 3D scenes are lazy-loaded to minimize initial bundle size
- WebGL support detection prevents crashes on unsupported devices
- Consider implementing level-of-detail optimizations for complex city scenes