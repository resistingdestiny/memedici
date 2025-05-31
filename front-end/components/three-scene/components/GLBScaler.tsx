"use client";

import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useRef } from "react";

// Target sizes for different object types
const TARGET_SIZES = {
  building: 8.0,  // Buildings should be around 8 units in their largest dimension
  robot: 2.5,     // Robots should be around 2.5 units in their largest dimension
  house: 6.0,     // Houses should be around 6 units in their largest dimension
  default: 5.0    // Default size for unknown types
};

// Function to determine object type based on filename
function getObjectType(glbFile: string): keyof typeof TARGET_SIZES {
  const fileName = glbFile.toLowerCase();
  
  if (fileName.includes('robot') || fileName.includes('agent')) {
    return 'robot';
  } else if (fileName.includes('house') || fileName.includes('home')) {
    return 'house';
  } else if (fileName.includes('building') || fileName.includes('bar') || fileName.includes('ams') || 
             fileName.includes('steampunk') || fileName.includes('oriental') || fileName.includes('treehouse')) {
    return 'building';
  }
  
  return 'default';
}

// Helper function to scale a GLB scene to fit the target size
function scaleToFit(sceneOrGroup: THREE.Object3D, targetSize: number) {
  // 1) Compute the bounding box of the entire object hierarchy
  const bbox = new THREE.Box3().setFromObject(sceneOrGroup);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  // 2) Find the maximum dimension (width, height, or depth)
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) return; // avoid division by zero if something went wrong

  // 3) Compute the uniform scale factor so that maxDim → targetSize
  const scaleFactor = targetSize / maxDim;

  // 4) Apply the scale to the root of this glTF
  sceneOrGroup.scale.setScalar(scaleFactor);

  // 5) Re-center on the origin so the bottom sits at y=0
  const bboxScaled = new THREE.Box3().setFromObject(sceneOrGroup);
  const minY = bboxScaled.min.y;
  sceneOrGroup.position.y -= minY; // pull the model down so its lowest point is y=0

  console.log(`📏 Auto-scaled ${sceneOrGroup.userData.fileName || 'GLB'}:`, {
    originalSize: { x: size.x, y: size.y, z: size.z },
    maxDimension: maxDim,
    targetSize,
    scaleFactor,
    finalScale: sceneOrGroup.scale.x
  });
}

// Enhanced GLB loader with automatic scaling
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
  const { scene } = useGLTF(`/glb/${glbFile}`);
  const clonedScene = scene.clone();
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (clonedScene && groupRef.current) {
      // Determine target size based on object type or override
      const objectType = getObjectType(glbFile);
      const targetSize = targetSizeOverride || TARGET_SIZES[objectType];
      
      // Store filename for debugging
      clonedScene.userData.fileName = glbFile;
      
      // Apply automatic scaling
      scaleToFit(clonedScene, targetSize);
    }
  }, [clonedScene, glbFile, targetSizeOverride]);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <primitive 
        object={clonedScene}
        {...props}
      />
    </group>
  );
}

// Convenience function to get target size for a specific GLB file
export function getTargetSize(glbFile: string): number {
  const objectType = getObjectType(glbFile);
  return TARGET_SIZES[objectType];
}

// Function to preload GLB files with console info
export function preloadGLBFile(glbFile: string) {
  console.log(`🔄 Preloading GLB: ${glbFile}`);
  useGLTF.preload(`/glb/${glbFile}`);
}

// Preload all common GLB files
export function preloadAllGLBFiles() {
  const commonFiles = [
    'pastel_house.glb',
    'hw_4_cyberpunk_sci-fi_building.glb',
    'make_your_own_steampunk_house.glb',
    'mushroom_house.glb',
    'oriental_building.glb',
    'the_neko_stop-off__-_hand-painted_diorama.glb',
    'treehouse_concept.glb',
    'ams_s2.glb',
    'cyberpunk_bar.glb',
    'cyberpunk_robot.glb'
  ];
  
  commonFiles.forEach(preloadGLBFile);
} 