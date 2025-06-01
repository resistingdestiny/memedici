"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LayoutContextType {
  isLayoutReady: boolean;
  setLayoutReady: (ready: boolean) => void;
  layoutError: string | null;
  setLayoutError: (error: string | null) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);

  useEffect(() => {
    // Check if essential layout components are ready
    const checkLayoutReadiness = () => {
      try {
        // Wait for document to be ready
        if (document.readyState !== 'complete') {
          return false;
        }

        // Check if fonts are loaded
        if (document.fonts && document.fonts.status !== 'loaded') {
          return false;
        }

        // Check if critical CSS is loaded
        const stylesheets = document.styleSheets;
        for (let i = 0; i < stylesheets.length; i++) {
          try {
            // Try to access rules to ensure stylesheet is loaded
            const sheet = stylesheets[i];
            if (sheet.href && !sheet.cssRules) {
              return false;
            }
          } catch (e) {
            // Cross-origin stylesheets might throw, but that's okay
            continue;
          }
        }

        // Check if navigation bar is rendered
        const navbar = document.querySelector('header');
        if (!navbar) {
          return false;
        }

        return true;
      } catch (error) {
        console.error('Layout readiness check failed:', error);
        setLayoutError(error instanceof Error ? error.message : 'Unknown layout error');
        return false;
      }
    };

    // Initial check
    if (checkLayoutReadiness()) {
      setIsLayoutReady(true);
      return;
    }

    // Set up interval to check periodically
    const checkInterval = setInterval(() => {
      if (checkLayoutReadiness()) {
        setIsLayoutReady(true);
        clearInterval(checkInterval);
      }
    }, 100);

    // Set up timeout to prevent infinite waiting
    const timeout = setTimeout(() => {
      console.warn('Layout readiness timeout - forcing ready state');
      setIsLayoutReady(true);
      clearInterval(checkInterval);
    }, 10000); // 10 second timeout

    // Listen for load events
    const handleLoad = () => {
      setTimeout(() => {
        if (checkLayoutReadiness()) {
          setIsLayoutReady(true);
          clearInterval(checkInterval);
          clearTimeout(timeout);
        }
      }, 100);
    };

    const handleFontsLoad = () => {
      setTimeout(() => {
        if (checkLayoutReadiness()) {
          setIsLayoutReady(true);
          clearInterval(checkInterval);
          clearTimeout(timeout);
        }
      }, 100);
    };

    window.addEventListener('load', handleLoad);
    document.fonts?.addEventListener('loadingdone', handleFontsLoad);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
      window.removeEventListener('load', handleLoad);
      document.fonts?.removeEventListener('loadingdone', handleFontsLoad);
    };
  }, []);

  const setLayoutReady = (ready: boolean) => {
    setIsLayoutReady(ready);
  };

  return (
    <LayoutContext.Provider 
      value={{ 
        isLayoutReady, 
        setLayoutReady, 
        layoutError, 
        setLayoutError 
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutReady() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayoutReady must be used within a LayoutProvider');
  }
  return context;
}

// Loading component for layout readiness
export function LayoutLoadingScreen() {
  const [loadingTime, setLoadingTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleReload = (e?: React.MouseEvent | React.TouchEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('🔄 Reload button clicked!');
    
    // Add immediate visual feedback
    const target = e?.target as HTMLElement;
    if (target) {
      target.style.backgroundColor = 'rgba(34, 197, 94, 0.3)';
      target.style.borderColor = 'rgb(34, 197, 94)';
      target.innerText = 'Reloading...';
    }
    
    // Use setTimeout to ensure the visual update is rendered
    setTimeout(() => {
      try {
        // Try multiple reload methods
        console.log('Attempting window.location.reload()...');
        window.location.reload();
      } catch (error) {
        console.error('window.location.reload() failed:', error);
        try {
          console.log('Attempting window.location.href redirect...');
          window.location.href = window.location.href;
        } catch (error2) {
          console.error('window.location.href failed:', error2);
          try {
            console.log('Attempting window.location.replace...');
            window.location.replace(window.location.href);
          } catch (error3) {
            console.error('All reload methods failed:', error3);
            // Force a hard reload
            window.location.assign(window.location.href);
          }
        }
      }
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleReload(e);
    }
  };

  const handleTouch = (e: React.TouchEvent) => {
    handleReload(e);
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-black">
      <div className="bg-black/90 backdrop-blur-xl border border-cyan-400 rounded-xl p-8 text-cyan-400 font-mono text-center shadow-lg shadow-cyan-400/25 max-w-md">
        <div className="text-2xl font-bold mb-4">🏛️ MEMEDICI</div>
        <div className="text-lg mb-2">Initializing Layout...</div>
        <div className="text-sm opacity-70 mb-4">
          {loadingTime < 3 ? "Loading fonts and styles..." : 
           loadingTime < 6 ? "Setting up navigation..." :
           loadingTime < 9 ? "Preparing interface..." :
           "Finalizing layout..."}
        </div>
        
        {/* Loading spinner */}
        <div className="mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
        </div>
        
        {/* Loading timer */}
        <div className="text-xs opacity-50 mb-4">
          Loading time: {loadingTime}s
        </div>

        {/* Always visible reload button with multiple event handlers */}
        <div className="mb-4">
          <button 
            onClick={handleReload}
            onMouseDown={handleReload}
            onKeyDown={handleKeyDown}
            onTouchStart={handleTouch}
            onDoubleClick={handleReload}
            className="bg-gray-600/20 hover:bg-gray-600/40 border border-gray-400 text-gray-400 hover:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer select-none"
            type="button"
            tabIndex={0}
            role="button"
            aria-label="Reload page if not automatically redirected"
            style={{ pointerEvents: 'auto', userSelect: 'none' }}
          >
            Click here if not automatically redirected
          </button>
        </div>

        {/* Alternative text link */}
        <div className="mb-4">
          <span 
            onClick={handleReload}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleReload(e);
              }
            }}
            className="text-blue-400 underline cursor-pointer hover:text-blue-300"
            role="button"
            tabIndex={0}
            aria-label="Alternative reload link"
            style={{ pointerEvents: 'auto' }}
          >
            Or click this text to reload
          </span>
        </div>
        
        {/* Reload button for stuck loading */}
        {loadingTime > 10 && (
          <div className="mb-4">
            <button 
              onClick={handleReload}
              onMouseDown={handleReload}
              onDoubleClick={handleReload}
              className="bg-red-600/20 hover:bg-red-600/40 border border-red-400 text-red-400 hover:text-red-300 px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              type="button"
              role="button"
              aria-label="Reload page - loading taking too long"
              style={{ pointerEvents: 'auto' }}
            >
              🔄 Reload Page
            </button>
            <div className="text-xs text-red-400/70 mt-2">
              Layout taking too long? Try reloading
            </div>
          </div>
        )}

        {/* Manual instructions */}
        <div className="text-xs text-gray-500 mt-4">
          If buttons don't work, press <kbd className="bg-gray-700 px-1 rounded">F5</kbd> or <kbd className="bg-gray-700 px-1 rounded">Ctrl+R</kbd>
        </div>
        
        {/* Fallback pure HTML/JS button - works even when React is broken */}
        <div className="mt-4" dangerouslySetInnerHTML={{
          __html: `
            <button 
              onclick="
                console.log('Fallback reload clicked');
                this.innerText = 'Reloading...';
                this.style.backgroundColor = 'rgba(34, 197, 94, 0.3)';
                this.style.borderColor = 'rgb(34, 197, 94)';
                setTimeout(() => {
                  try {
                    window.location.reload(true);
                  } catch(e) {
                    try {
                      window.location.href = window.location.href;
                    } catch(e2) {
                      window.location.assign(window.location.href);
                    }
                  }
                }, 100);
              "
              style="
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid rgb(239, 68, 68);
                color: rgb(239, 68, 68);
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                transition: all 0.2s;
              "
              onmouseover="this.style.backgroundColor='rgba(239, 68, 68, 0.4)'"
              onmouseout="this.style.backgroundColor='rgba(239, 68, 68, 0.2)'"
            >
              🚨 Emergency Reload (Pure HTML)
            </button>
          `
        }} />
        
        {/* Helpful tip for longer loading times */}
        {loadingTime > 15 && (
          <div className="text-xs text-gray-400 border-t border-gray-600/20 pt-4">
            💡 Waiting for layout components to load
          </div>
        )}
      </div>
    </div>
  );
} 