"use client";

import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";

// ─────── IMPORT SkeletonUtils ─────────────────────────
// Install `three-stdlib` and import from there:
import { SkeletonUtils } from "three-stdlib";

/**
 * Remove any THREE.Line, THREE.LineSegments, or THREE.LineLoop
 * from a given object and its children. This strips out all "metal lines" that
 * were exported as line primitives.
 */
function removeLines(rootObject: THREE.Object3D) {
  const toRemove: THREE.Object3D[] = [];
  
  rootObject.traverse((child) => {
    // Three.js identifies line-based objects with these types:
    if (child.type === 'Line' || child.type === 'LineSegments' || child.type === 'LineLoop') {
      toRemove.push(child);
    }
    
    // Also remove any object with "line" in the name (case insensitive)
    if (child.name && child.name.toLowerCase().includes('line')) {
      toRemove.push(child);
    }
    
    // Remove objects with wire/wireframe/edge/line materials
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (material.name && (
          material.name.toLowerCase().includes('wire') ||
          material.name.toLowerCase().includes('line') ||
          material.name.toLowerCase().includes('edge')
        )) {
          toRemove.push(child);
        }
      });
    }
  });
  
  // Remove collected line objects
  toRemove.forEach(child => {
    if (child.parent) {
      child.parent.remove(child);
      console.log(`🗑️ Removed line primitive: ${child.type} (${child.name || 'unnamed'})`);
    }
  });
  
  return toRemove.length;
}

/**
 * Remove any typical helper objects—SkeletonHelper, CameraHelper, GridHelper, etc.
 */
function removeHelpers(rootObject: THREE.Object3D) {
  const toRemove: THREE.Object3D[] = [];
  
  rootObject.traverse((child) => {
    // child.isHelper is true for most built-in helper types (e.g. SkeletonHelper)
    if ((child as any).isHelper) {
      toRemove.push(child);
    }
    // Also check for common helper names from exporters
    if (child.name && (
      child.name.toLowerCase().includes('skeletonhelper') ||
      child.name.toLowerCase().includes('helper') ||
      child.name.toLowerCase().includes('gizmo') ||
      child.name.toLowerCase().includes('armature_helper')
    )) {
      toRemove.push(child);
    }
  });
  
  // Remove collected helper objects
  toRemove.forEach(child => {
    if (child.parent) {
      child.parent.remove(child);
      console.log(`🗑️ Removed helper object: ${child.type} (${child.name || 'unnamed'})`);
    }
  });
  
  return toRemove.length;
}

// Target sizes for different object types
const TARGET_SIZES = {
  building: 15.0,    // Buildings should be around 15 units (much larger studios)
  robot: 2.5,        // Robots should be around 2.5 units in their largest dimension
  house: 12.0,       // Houses should be around 12 units (larger than buildings for residential feel)
  contraption: 25.0, // Mysterious contraption should be large and imposing
  exchange: 35.0,    // Exchange building should be MUCH bigger
  hub: 35.0,         // Agent builder hub should be MUCH bigger
  cyberpunk: 25.0,   // Cyberpunk sci-fi building should be much bigger
  gallery: 30.0,     // Interdimensional art gallery should be large and impressive
  default: 5.0       // Default size for unknown types
};

// Function to determine object type based on filename
function getObjectType(glbFile: string): keyof typeof TARGET_SIZES {
  const fileName = glbFile.toLowerCase();
  
  if (fileName.includes('robot') || fileName.includes('agent')) {
    return 'robot';
  } else if (fileName.includes('house') || fileName.includes('home')) {
    return 'house';
  } else if (fileName.includes('contraption') || fileName.includes('mysterious')) {
    return 'contraption';
  } else if (fileName.includes('ams_s2') || fileName.includes('exchange')) {
    return 'exchange';
  } else if (fileName.includes('cyberpunk_bar') || fileName.includes('hub')) {
    return 'hub';
  } else if (fileName.includes('hw_4_cyberpunk_sci-fi_building')) {
    return 'cyberpunk';
  } else if (fileName.includes('interdimensional_art_gallery')) {
    return 'gallery';
  } else if (fileName.includes('building') || fileName.includes('bar') || fileName.includes('ams') || 
             fileName.includes('steampunk') || fileName.includes('oriental')) {
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

// GLB Instance Cache to prevent multiple loads of the same file
const glbInstanceCache = new Map<string, THREE.Object3D>();

// Clear cache function to prevent memory leaks
export function clearGLBCache() {
  console.log('🧹 Clearing GLB cache to free memory');
  glbInstanceCache.forEach((scene, key) => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
  });
  glbInstanceCache.clear();
}

// Get cache size for monitoring
export function getGLBCacheSize() {
  return glbInstanceCache.size;
}

// Enhanced GLB loader with automatic scaling - FIXED VERSION WITH WORKING CACHE
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
  const gltfData = useGLTF(`/glb/${glbFile}`);
  const { scene } = gltfData;
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    // Ensure the glTF scene is loaded before attempting to clone
    if (!scene) {
      console.warn(`⚠️ [${glbFile}] Scene is not yet defined; skipping animation setup.`);
      return;
    }
    if (groupRef.current) {
      try {
        // Check if we already have a processed version of this GLB
        const cacheKey = `${glbFile}_${targetSizeOverride || 'default'}`;
        let clonedScene: THREE.Object3D;
        
        if (glbInstanceCache.has(cacheKey)) {
          console.log(`♻️ Reusing cached GLB: ${glbFile}`);
          clonedScene = glbInstanceCache.get(cacheKey)!.clone();
        } else {
          console.log(`🆕 Processing new GLB: ${glbFile}`);
          clonedScene = scene.clone();
          
          // PRESERVE EVERYTHING FOR ALL MODELS - NO MODIFICATIONS AT ALL
          console.log(`🌟 [${glbFile}] PRESERVING EVERYTHING - no cleanup, no modifications whatsoever`);
          
          // Determine target size based on object type or override
          const objectType = getObjectType(glbFile);
          const targetSize = targetSizeOverride || TARGET_SIZES[objectType];
          
          // Store filename for debugging
          clonedScene.userData.fileName = glbFile;
          
          // Apply automatic scaling
          scaleToFit(clonedScene, targetSize);
          
          // Cache the processed scene
          glbInstanceCache.set(cacheKey, clonedScene.clone());
          
          console.log(`✅ GLB processed and cached: ${glbFile}`);
        }
        
        // Clear existing children and add the new scene
        groupRef.current.clear();
        groupRef.current.add(clonedScene);
        
      } catch (error) {
        console.error(`❌ Error processing GLB: ${glbFile}`, error);
      }
    }
  }, [scene, glbFile, targetSizeOverride]);

  // Always render the group - models will be added via useEffect
  return (
    <group ref={groupRef} position={position} rotation={rotation} {...props} />
  );
}

// NEW: Animated GLB loader with proper animation handling
export function AnimatedScaledGLB({
  glbFile,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  targetSizeOverride,
  playAllAnimations = true,
  specificAnimations = [],
  ...props
}: {
  glbFile: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  targetSizeOverride?: number;
  playAllAnimations?: boolean;
  specificAnimations?: string[];
  [key: string]: any;
}) {
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY EARLY RETURNS
  const { scene, animations } = useGLTF(`/glb/${glbFile}`);
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  // Move useEffect to the top
  useEffect(() => {
    // Don't try to clone/animate until the GLTF is actually loaded
    if (!scene) return;
    
    // Wait until the <group> is mounted
    if (!groupRef.current) return;

    // 1) Log how many scenes/animations are here
    console.log(
      `👉 [${glbFile}] INSPECTION: Scenes: 1, Animations: ${animations.length}`
    );
    animations.forEach((clip, i) => {
      console.log(
        `  Clip[${i}]: name="${clip.name}", duration=${clip.duration.toFixed(
          2
        )}s, tracks=${clip.tracks.length}`
      );
      // (log each track name for debugging)
      clip.tracks.forEach((t, ti) => {
        console.log(`    Track[${ti}]: "${t.name}" (${t.times.length} keys)`);
      });
    });

    // 2) Clear old mixer if any
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }

    // 3) Deep‐clone via SkeletonUtils so skinned meshes & bones copy correctly
    console.log(`🔄 [${glbFile}] Cloning animated GLB`);
    const clonedScene: THREE.Object3D = SkeletonUtils.clone(scene);
    clonedScene.userData.fileName = glbFile;

    // PRESERVE ABSOLUTELY EVERYTHING FOR ALL ANIMATED MODELS - NO MODIFICATIONS
    console.log(`🌟 [${glbFile}] PRESERVING EVERYTHING for animated model - no cleanup, no modifications whatsoever`);
    // Don't remove anything at all from any animated model - not even helpers

    // 4) Auto‐scale
    const objectType = getObjectType(glbFile);
    const targetSize = targetSizeOverride || TARGET_SIZES[objectType];
    scaleToFit(clonedScene, targetSize);

    // 5) Ensure every SkinnedMesh has skinning=true
    clonedScene.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh) {
        console.log(`🦴 [${glbFile}] Found SkinnedMesh: ${child.name}`);
        if (child.material) {
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];
          mats.forEach((mat) => {
            if ("skinning" in mat) {
              (mat as any).skinning = true;
              console.log(
                `👍 Enabled skinning on material for ${child.name}`
              );
            } else {
              console.warn(
                `⚠️ Material for ${child.name} cannot skin. Type:`,
                mat.constructor.name
              );
            }
          });
        }
      }
    });

    // 6) Clone each AnimationClip so it will retarget to our new bones
    const localClips = animations.map((clip) => clip.clone());

    // 7) Create the mixer and bind each clip to clonedScene
    if (localClips.length > 0) {
      mixerRef.current = new THREE.AnimationMixer(clonedScene);

      if (playAllAnimations) {
        console.log(
          `🎬 [${glbFile}] Playing ALL ${localClips.length} animations:`
        );
        localClips.forEach((clip, index) => {
          console.log(`▶️ [${glbFile}] Starting clip ${index + 1}: "${clip.name}"`);
          const action = mixerRef.current!.clipAction(clip, clonedScene);
          action.reset();
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.clampWhenFinished = false;
          action.play();
          console.log(`✅ [${glbFile}] Clip "${clip.name}" started`);
        });
      } else if (specificAnimations.length > 0) {
        specificAnimations.forEach((animName) => {
          const clip = THREE.AnimationClip.findByName(localClips, animName);
          if (clip) {
            console.log(`▶️ [${glbFile}] Playing specific clip: "${animName}"`);
            const action = mixerRef.current!.clipAction(clip, clonedScene);
            action.reset();
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.clampWhenFinished = false;
            action.play();
          } else {
            console.warn(
              `⚠️ Clip "${animName}" not found in ${glbFile}. Available: ${localClips.map(
                (c) => c.name
              )}`
            );
          }
        });
      }
    } else {
      console.log(`📝 [${glbFile}] No animation clips found.`);
    }

    // 8) Attach clonedScene under our group
    groupRef.current.clear();
    groupRef.current.add(clonedScene);

    // 9) On unmount, stop the mixer
    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
    };
  },
  [
    scene,
    animations,
    glbFile,
    targetSizeOverride,
    playAllAnimations,
    specificAnimations,
  ]);

  // 10) Drive the mixer on each frame
  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);

      // Optional debug every 5 seconds
      if (
        Math.floor(state.clock.elapsedTime) % 5 === 0 &&
        Math.floor(state.clock.elapsedTime * 10) % 10 === 0
      ) {
        console.log(
          `🎭 Mixer running for ${glbFile} at ${state.clock.elapsedTime.toFixed(1)}s`
        );
      }
    }
  });

  // Don't try to clone/animate until the GLTF is actually loaded
  if (!scene) {
    return null;
  }

  // 11) Always render an empty <group> (the GLB will be injected via useEffect)
  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      {...props}
    />
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
    'mushroom_house.glb',
    'oriental_building.glb',
    'the_neko_stop-off__-_hand-painted_diorama.glb',
    'ams_s2.glb',
    'cyberpunk_bar.glb',
    'cyberpunk_robot.glb',
    'robot_playground.glb',
    'diamond_hands.glb',
    'the_artist.glb',
    '16_mysterious_contraption.glb',
    'fucursor.glb'
  ];
  
  commonFiles.forEach(preloadGLBFile);
}