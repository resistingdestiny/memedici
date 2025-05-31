"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Client-only wrapper component
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading Medici City...</p>
          <p className="text-sm text-muted-foreground">Preparing your 3D experience</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Dynamic import to avoid SSR issues with Three.js and WebGL
const WebGLCheck = dynamic(
  () => import("@/components/three-scene/webgl-check").then((mod) => ({ default: mod.WebGLCheck })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

const CityScene = dynamic(
  () => import("@/components/three-scene/city-scene").then((mod) => ({ default: mod.CityScene })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading 3D Scene...</p>
          <p className="text-sm text-muted-foreground">This may take a moment</p>
        </div>
      </div>
    ),
  }
);

const CityUI = dynamic(
  () => import("@/components/three-scene/city-ui").then((mod) => ({ default: mod.CityUI })),
  {
    ssr: false,
  }
);

const GuidedTour = dynamic(
  () => import("@/components/three-scene/guided-tour").then((mod) => ({ default: mod.GuidedTour })),
  {
    ssr: false,
  }
);

export default function CityPage() {
  return (
    <ClientOnly>
      <WebGLCheck>
        <div className="relative w-full h-screen overflow-hidden">
          {/* 3D Scene */}
          <CityScene />
          
          {/* UI Overlay */}
          <CityUI />
          
          {/* Guided Tour Logic */}
          <GuidedTour />
        </div>
      </WebGLCheck>
    </ClientOnly>
  );
}