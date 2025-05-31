"use client";

import { useEffect, useRef } from "react";
import { useCityStore } from "@/lib/stores/use-city";

export function GuidedTour() {
  const { 
    studios, 
    tourMode, 
    moveToStudio, 
    stopTour 
  } = useCityStore();
  
  const tourIndexRef = useRef(0);
  const tourIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (tourMode && studios.length > 0) {
      // Start the guided tour
      const startTour = () => {
        if (tourIntervalRef.current) {
          clearInterval(tourIntervalRef.current);
        }
        
        // Move to the first studio immediately
        moveToStudio(studios[0].id);
        tourIndexRef.current = 0;
        
        // Set up interval to move through studios
        tourIntervalRef.current = setInterval(() => {
          tourIndexRef.current = (tourIndexRef.current + 1) % studios.length;
          moveToStudio(studios[tourIndexRef.current].id);
        }, 6000); // 6 seconds per studio
      };
      
      startTour();
      
      // Auto-stop tour after visiting all studios twice
      const autoStopTimeout = setTimeout(() => {
        stopTour();
      }, studios.length * 6000 * 2);
      
      return () => {
        if (tourIntervalRef.current) {
          clearInterval(tourIntervalRef.current);
        }
        clearTimeout(autoStopTimeout);
      };
    } else {
      // Stop tour
      if (tourIntervalRef.current) {
        clearInterval(tourIntervalRef.current);
        tourIntervalRef.current = null;
      }
    }
  }, [tourMode, studios, moveToStudio, stopTour]);
  
  // This component doesn't render anything visible
  return null;
} 