"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ScaledGLB } from "./GLBScaler";

export function PastelHouse({ position = [0, 0, 0], rotation = [0, 0, 0] }: {
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Add subtle floating animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      
      // Subtle rotation for visual interest
      groupRef.current.rotation.y = rotation[1] + Math.sin(state.clock.elapsedTime * 0.2) * 0.01;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* PASTEL HOUSE GLB MODEL with automatic scaling */}
      <ScaledGLB 
        glbFile="https://siliconroads.com/pastel_house.glb"
        castShadow
        receiveShadow
      />
    </group>
  );
}

// Note: Preloading is now handled by the GLBScaler component 