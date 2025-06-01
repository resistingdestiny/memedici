"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { LayoutWrapper } from "@/components/layout/layout-wrapper";

// Enhanced loading component - removed timeout functionality
const LoadingScreen = () => {
  const [loadingTime, setLoadingTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getLoadingMessage = () => {
    if (loadingTime < 5) return "Initializing 3D Environment";
    if (loadingTime < 10) return "Loading GLB Models...";
    if (loadingTime < 15) return "Setting up WebGL Context...";
    if (loadingTime < 30) return "Loading 3D assets...";
    return "Finalizing virtual gallery...";
  };

  const handleReload = () => {
    console.log('Reload button clicked!');
    try {
      window.location.reload();
    } catch (error) {
      console.error('Failed to reload:', error);
      // Fallback reload method
      window.location.href = window.location.href;
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-black">
      <div className="bg-black/90 backdrop-blur-xl border border-cyan-400 rounded-xl p-8 text-cyan-400 font-mono text-center shadow-lg shadow-cyan-400/25 max-w-md">
        <div className="text-2xl font-bold mb-4">🏛️ MEDICI CITY</div>
        <div className="text-lg mb-2">Loading Virtual Art Gallery...</div>
        <div className="text-sm opacity-70 mb-4">{getLoadingMessage()}</div>
        
        {/* Loading spinner */}
        <div className="mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
        </div>
        
        {/* Loading timer */}
        <div className="text-xs opacity-50 mb-4">
          Loading time: {loadingTime}s
        </div>

        {/* Always visible reload button */}
        <div className="mb-4">
          <button 
            onClick={handleReload}
            className="bg-gray-600/20 hover:bg-gray-600/40 border border-gray-400 text-gray-400 hover:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Click here if not automatically redirected
          </button>
        </div>
        
        {/* Prominent reload button appears sooner when loading takes too long */}
        {loadingTime > 10 && (
          <div className="mb-4">
            <button 
              onClick={handleReload}
              className="bg-red-600/20 hover:bg-red-600/40 border border-red-400 text-red-400 hover:text-red-300 px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
            >
              🔄 Reload Page
            </button>
            <div className="text-xs text-red-400/70 mt-2">
              Taking too long? Try reloading
            </div>
          </div>
        )}

        {/* Warning for users after 8 seconds */}
        {loadingTime > 8 && loadingTime <= 10 && (
          <div className="text-xs text-yellow-400/80 mb-2">
            💡 If loading seems stuck, try the reload button above
          </div>
        )}
        
        {/* Helpful tip for longer loading times */}
        {loadingTime > 20 && (
          <div className="text-xs text-gray-400 border-t border-gray-600/20 pt-4">
            💡 Loading large 3D models - this may take a moment
          </div>
        )}
      </div>
    </div>
  );
};

// Dynamically import the entire CityScene
const CityScene = dynamic(() => import('@/components/three-scene/city-scene').then(mod => ({ default: mod.CityScene })), { 
  ssr: false,
  loading: () => <LoadingScreen />
});

export default function CityPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading until mounted
  if (!mounted) {
    return <LoadingScreen />;
  }

  // Use layout wrapper with custom loading disabled since we have 3D-specific loading
  return (
    <LayoutWrapper showLoadingScreen={false}>
      <CityScene />
    </LayoutWrapper>
  );
}