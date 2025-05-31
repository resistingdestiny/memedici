"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  // Ensure we're rendering client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

// WebGL Support Context
type WebGLContextType = {
  isSupported: boolean;
  setIsSupported: (supported: boolean) => void;
};

const WebGLContext = createContext<WebGLContextType | null>(null);

export function WebGLProvider({ children }: { children: React.ReactNode }) {
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setIsSupported(!!gl);
    } catch (e) {
      setIsSupported(false);
    }
  }, []);

  return (
    <WebGLContext.Provider value={{ isSupported, setIsSupported }}>
      {children}
    </WebGLContext.Provider>
  );
}

export const useWebGL = () => {
  const context = useContext(WebGLContext);
  if (!context) {
    throw new Error('useWebGL must be used within a WebGLProvider');
  }
  return context;
};