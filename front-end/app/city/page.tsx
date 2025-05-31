"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

// Single loading component
const LoadingScreen = () => (
  <div className="w-full h-screen flex items-center justify-center bg-black">
    <div className="bg-black/90 backdrop-blur-xl border border-cyan-400 rounded-xl p-8 text-cyan-400 font-mono text-center shadow-lg shadow-cyan-400/25">
      <div className="text-2xl font-bold mb-4">🏛️ MEDICI CITY</div>
      <div className="text-lg mb-2">Loading Virtual Art Gallery...</div>
      <div className="text-sm opacity-70">Initializing 3D Environment</div>
      <div className="mt-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
      </div>
    </div>
  </div>
);

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

  return <CityScene />;
}