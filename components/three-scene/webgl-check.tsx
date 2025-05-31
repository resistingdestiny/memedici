"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface WebGLCheckProps {
  children: React.ReactNode;
}

export function WebGLCheck({ children }: WebGLCheckProps) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);

  useEffect(() => {
    // Check WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    setHasWebGL(!!gl);
  }, []);

  if (hasWebGL === null) {
    // Loading state
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasWebGL) {
    // WebGL not supported
    return (
      <div className="min-h-screen pt-16 px-4 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">WebGL Not Supported</h2>
            <p className="text-muted-foreground mb-4">
              Your browser doesn't support WebGL, which is required for the 3D city experience.
            </p>
            <p className="text-sm text-muted-foreground">
              Please try using a modern browser like Chrome, Firefox, Safari, or Edge.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
} 