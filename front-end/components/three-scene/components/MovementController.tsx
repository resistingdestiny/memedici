"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// KEYBOARD CONTROLS MAPPING 🎮
export const MOVEMENT_KEYS = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'leftward', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'rightward', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'run', keys: ['ShiftLeft'] },
  { name: 'toggleView', keys: ['KeyV'] },
  { name: 'zoomIn', keys: ['Equal', 'NumpadAdd'] },
  { name: 'zoomOut', keys: ['Minus', 'NumpadSubtract'] }
];

// SMOOTH MOVEMENT CONTROLLER - CURSOR ALWAYS VISIBLE 🎮
export function MovementController() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const keyState = useRef({
    forward: false,
    backward: false,
    leftward: false,
    rightward: false,
  });
  const SPEED = 150;

  // Preallocated vectors
  const movementVec = useRef(new THREE.Vector3()).current;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keyState.current.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keyState.current.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keyState.current.leftward = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keyState.current.rightward = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keyState.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keyState.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keyState.current.leftward = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keyState.current.rightward = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (!controlsRef.current) return;
    
    // Fixed delta for completely consistent movement
    const fixedDelta = 1/60; // Always use 60fps delta for consistency
    
    const { forward, backward, leftward, rightward } = keyState.current;

    let moveX = 0;
    let moveZ = 0;
    if (forward) moveZ += 1;   // W moves forward
    if (backward) moveZ -= 1;  // S moves backward
    if (leftward) moveX -= 1;  // A moves left
    if (rightward) moveX += 1; // D moves right

    if (moveX !== 0 || moveZ !== 0) {
      // Normalize input direction
      const len = Math.hypot(moveX, moveZ);
      moveX /= len;
      moveZ /= len;

      // Get camera's current orientation (independent of distance)
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      cameraDirection.y = 0; // Keep movement horizontal
      cameraDirection.normalize();
      
      const right = new THREE.Vector3();
      right.crossVectors(cameraDirection, camera.up).normalize();

      // Fixed movement distance per frame (independent of camera distance)
      const moveDistance = SPEED * fixedDelta;

      // Calculate movement vector with fixed distance
      movementVec.set(0, 0, 0);
      movementVec.addScaledVector(right, moveX * moveDistance);
      movementVec.addScaledVector(cameraDirection, moveZ * moveDistance);

      // Move both camera and target together to maintain relative position
      const currentCameraPosition = camera.position.clone();
      const currentTarget = controlsRef.current.target.clone();
      
      // Get new position after movement
      const newCameraPosition = currentCameraPosition.clone().add(movementVec);
      const newTarget = currentTarget.clone().add(movementVec);
      
      // Define movement boundaries (adjust these based on your scene size)
      const BOUNDARY_SIZE = 200; // This should contain the city area
      const MIN_BOUNDARY = -BOUNDARY_SIZE;
      const MAX_BOUNDARY = BOUNDARY_SIZE;
      
      // Clamp the new positions to boundaries
      newCameraPosition.x = Math.max(MIN_BOUNDARY, Math.min(MAX_BOUNDARY, newCameraPosition.x));
      newCameraPosition.z = Math.max(MIN_BOUNDARY, Math.min(MAX_BOUNDARY, newCameraPosition.z));
      newTarget.x = Math.max(MIN_BOUNDARY, Math.min(MAX_BOUNDARY, newTarget.x));
      newTarget.z = Math.max(MIN_BOUNDARY, Math.min(MAX_BOUNDARY, newTarget.z));

      // Apply the bounded movement
      camera.position.copy(newCameraPosition);
      controlsRef.current.target.copy(newTarget);
      
      // Force update the controls
      controlsRef.current.update();
    }
  });

  return (
    <>
      {/* Add OrbitControls for camera look */}
      <OrbitControls 
        ref={controlsRef}
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        enableDamping={true}
        dampingFactor={0.1}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 6}
        maxDistance={50}
        minDistance={5}
      />
    </>
  );
} 