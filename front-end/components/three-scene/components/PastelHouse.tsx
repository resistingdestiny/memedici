"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export function PastelHouse({ position = [0, 0, 0], scale = 1, rotation = [0, 0, 0] }: {
  position?: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Load the GLB model
  const { scene } = useGLTF('/glb/pastel_house.glb');
  
  // Clone the scene to avoid issues with multiple instances
  const clonedScene = scene.clone();

  useFrame((state) => {
    if (groupRef.current) {
      // Add subtle floating animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group 
      ref={groupRef} 
      position={position} 
      scale={scale} 
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <primitive object={clonedScene} />
    </group>
  );
}

// Preload the GLB for better performance
useGLTF.preload('/glb/pastel_house.glb'); 