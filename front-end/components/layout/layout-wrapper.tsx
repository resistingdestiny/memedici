"use client";

import { ReactNode } from 'react';
import { useLayoutReady, LayoutLoadingScreen } from '@/components/providers/layout-provider';

interface LayoutWrapperProps {
  children: ReactNode;
  /**
   * Whether to show a loading screen while layout is loading.
   * Set to false for pages that have their own loading mechanisms.
   */
  showLoadingScreen?: boolean;
  /**
   * Custom loading component to show instead of default
   */
  loadingComponent?: ReactNode;
}

export function LayoutWrapper({ 
  children, 
  showLoadingScreen = true,
  loadingComponent
}: LayoutWrapperProps) {
  const { isLayoutReady, layoutError } = useLayoutReady();

  // If there's a layout error, still render the children with error info
  if (layoutError) {
    console.warn('Layout error detected:', layoutError);
    // Still render children but with error context
  }

  // If layout is not ready and we should show loading screen
  if (!isLayoutReady && showLoadingScreen) {
    return loadingComponent || <LayoutLoadingScreen />;
  }

  // If layout is not ready but we shouldn't show loading screen,
  // add a minimal delay to prevent flash of unstyled content
  if (!isLayoutReady && !showLoadingScreen) {
    return (
      <div style={{ opacity: isLayoutReady ? 1 : 0, transition: 'opacity 0.3s ease' }}>
        {children}
      </div>
    );
  }

  return <>{children}</>;
} 