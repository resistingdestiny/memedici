import React, { useState, useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { getObjectType, scaleToFit } from '../../utils/utils';

// Enhanced GLB loader with automatic scaling and loading states
export function ScaledGLB({ 
  glbFile, 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  targetSizeOverride,
  ...props 
}: {
  glbFile: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  targetSizeOverride?: number;
  [key: string]: any;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { scene } = useGLTF(`/glb/${glbFile}`);
  const clonedScene = scene.clone();
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (clonedScene && groupRef.current) {
      try {
        // Determine target size based on object type or override
        const objectType = getObjectType(glbFile);
        const targetSize = targetSizeOverride || TARGET_SIZES[objectType];
        
        // Store filename for debugging
        clonedScene.userData.fileName = glbFile;
        
        // Apply automatic scaling
        scaleToFit(clonedScene, targetSize);
        
        // Mark as loaded successfully
        setIsLoaded(true);
        setHasError(false);
        
        console.log(`✅ GLB loaded successfully: ${glbFile}`);
      } catch (error) {
        console.error(`❌ Error processing GLB: ${glbFile}`, error);
        setHasError(true);
        setIsLoaded(false);
      }
    }
  }, [clonedScene, glbFile, targetSizeOverride]);

  // Don't render anything until the model is properly loaded and scaled
  if (!isLoaded || hasError) {
    return null;
  }

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <primitive 
        object={clonedScene}
        {...props}
      />
    </group>
  );
} 