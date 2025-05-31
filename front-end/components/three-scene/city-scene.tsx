"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { 
  OrbitControls, 
  Environment, 
  Html,
  Sparkles,
  Stars,
  Cloud,
  Sky,
  Float,
  ContactShadows,
  Sphere,
  RoundedBox,
  Text3D,
  MeshTransmissionMaterial,
  MeshReflectorMaterial,
  PointerLockControls,
  KeyboardControls,
  useTexture,
  Text,
  Box,
  Plane
} from "@react-three/drei";
import { useCityStore } from "@/lib/stores/use-city";
import * as THREE from "three";
import { CityUI } from "./city-ui";

// KEYBOARD CONTROLS MAPPING 🎮
const MOVEMENT_KEYS = [
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

// SICKO MODE CYBERPUNK STUDIO BUILDING 🔥
function StudioBuilding({ studio }: { studio: any }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { activeStudio, hoveredStudio, setHoveredStudio, setActiveStudio, enterGalleryMode } = useCityStore();
  
  const isActive = activeStudio === studio.id;
  const isHovered = hoveredStudio === studio.id;
  const showInterface = isHovered || isActive;
  
  useFrame((state) => {
    if (meshRef.current && glowRef.current) {
      // Sick floating animation
      const offset = isActive ? Math.sin(state.clock.elapsedTime * 3) * 0.2 : 0;
      meshRef.current.position.y = studio.position[1] + offset;
      
      // Cyberpunk glow pulsing
      const glow = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
      glowRef.current.scale.setScalar(1 + glow * 0.1);
      
      // Dynamic rotation for active
      if (isActive) {
        meshRef.current.rotation.y += 0.01;
      }
    }
  });
  
  return (
    <group position={studio.position} rotation={studio.rotation}>
      {/* MAIN CYBERPUNK STRUCTURE */}
      <RoundedBox
        ref={meshRef}
        args={[6, 8, 6]}
        radius={0.3}
        smoothness={4}
        onClick={(e) => {
          e.stopPropagation();
          setActiveStudio(studio.id);
        }}
        onPointerEnter={() => setHoveredStudio(studio.id)}
        onPointerLeave={() => setHoveredStudio(null)}
        castShadow
        receiveShadow
      >
        <MeshTransmissionMaterial
          backside
          samples={16}
          resolution={512}
          transmission={0.8}
          roughness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          thickness={0.5}
          chromaticAberration={0.5}
          anisotropy={0.3}
          distortion={0.2}
          distortionScale={0.1}
          temporalDistortion={0.1}
          color={isActive ? "#00ff88" : isHovered ? "#ff0088" : "#0088ff"}
        />
      </RoundedBox>

      {/* NEON GLOW OUTLINE */}
      <RoundedBox
        ref={glowRef}
        args={[6.2, 8.2, 6.2]}
        radius={0.3}
        smoothness={4}
      >
        <meshStandardMaterial
          color={isActive ? "#00ff88" : isHovered ? "#ff0088" : "#0088ff"}
          emissive={isActive ? "#00ff88" : isHovered ? "#ff0088" : "#0088ff"}
          emissiveIntensity={1.5}
          transparent
          opacity={0.3}
        />
      </RoundedBox>

      {/* HOLOGRAPHIC TOP */}
      <mesh position={[0, 4.5, 0]} castShadow>
        <cylinderGeometry args={[3.5, 3.5, 0.5, 8]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={isActive ? "#ffff00" : "#00ffff"}
          emissiveIntensity={2}
          metalness={1}
          roughness={0}
        />
      </mesh>

      {/* CYBERPUNK PILLARS */}
      {[-2.5, 2.5].map((x, i) => (
        <Float key={i} speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
          <mesh position={[x, 2, 3.2]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 8]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#00ffff"
              emissiveIntensity={1.2}
              metalness={1}
              roughness={0}
            />
          </mesh>
        </Float>
      ))}

      {/* ENERGY RINGS */}
      {[1, 3, 5].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[3.5, 0.1, 8, 32]} />
          <meshStandardMaterial
            color="#ff00ff"
            emissive="#ff00ff"
            emissiveIntensity={2}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}

      {/* CYBERPUNK AI AGENT */}
      <CyberpunkAgent agentId={studio.agentId} position={[0, 1, 2]} isActive={isActive} />
      
      {/* HOLOGRAPHIC ARTWORKS */}
      {studio.recentArtworks.map((artwork: any, index: number) => (
        <Float key={artwork.id} speed={2 + index * 0.5} rotationIntensity={0.1}>
          <HolographicArt
            artwork={artwork}
            position={[artwork.position[0], artwork.position[1] + 2, artwork.position[2] - 2]}
            isActive={isActive}
          />
        </Float>
      ))}
      
      {/* INSANE PARTICLE EFFECTS */}
      {isActive && (
        <>
          <Sparkles count={200} scale={15} size={6} speed={2} color="#00ff88" />
          <Sparkles count={100} scale={8} size={3} speed={1.5} color="#ffff00" />
        </>
      )}
    </group>
  );
}

// CYBERPUNK AI AGENT WITH INSANE EFFECTS 🤖
function CyberpunkAgent({ agentId, position, isActive }: { agentId: string; position: [number, number, number]; isActive: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current && headRef.current && ringRef.current) {
      // Cyberpunk floating
      const bob = Math.sin(state.clock.elapsedTime * 4) * 0.3;
      meshRef.current.position.y = position[1] + bob;
      headRef.current.position.y = position[1] + 1.5 + bob;
      
      // Head scanning rotation
      headRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 3) * 0.5;
      
      // Energy ring rotation
      ringRef.current.rotation.x += 0.02;
      ringRef.current.rotation.z += 0.01;
    }
  });
  
  return (
    <group position={position}>
      {/* MAIN AI BODY */}
      <RoundedBox ref={meshRef} args={[0.8, 2, 0.8]} radius={0.1} castShadow>
        <MeshTransmissionMaterial
          samples={16}
          resolution={256}
          transmission={0.9}
          roughness={0}
          clearcoat={1}
          thickness={0.3}
          chromaticAberration={0.8}
          distortionScale={0.1}
          temporalDistortion={0.1}
          color={isActive ? "#00ff88" : "#0088ff"}
        />
      </RoundedBox>
      
      {/* CYBERPUNK HEAD */}
      <Sphere ref={headRef} args={[0.4, 32, 32]} position={[0, 1.5, 0]} castShadow>
        <meshStandardMaterial 
          color="#ffffff"
          emissive={isActive ? "#00ff88" : "#0088ff"}
          emissiveIntensity={1.5}
          metalness={1}
          roughness={0}
        />
      </Sphere>
      
      {/* GLOWING EYES */}
      {[-0.15, 0.15].map((x, i) => (
        <mesh key={i} position={[x, 1.6, 0.35]} castShadow>
          <sphereGeometry args={[0.05]} />
          <meshStandardMaterial 
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={3}
          />
        </mesh>
      ))}
      
      {/* ENERGY RING AROUND AGENT */}
      <mesh ref={ringRef} position={[0, 1.5, 0]}>
        <torusGeometry args={[1, 0.05, 8, 32]} />
        <meshStandardMaterial
          color="#ffff00"
          emissive="#ffff00"
          emissiveIntensity={2}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* HOLOGRAPHIC SCANNING LINES */}
      {[0.5, 1, 1.5, 2].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[0, 0, 0]}>
          <ringGeometry args={[0.2, 1.2, 16]} />
          <meshStandardMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={1}
            transparent
            opacity={0.3}
          />
        </mesh>
      ))}
      
      {/* PARTICLE AURA */}
      <Sparkles count={50} scale={3} size={2} speed={2} color={isActive ? "#00ff88" : "#0088ff"} />
      
      {/* DATA STREAMS */}
      <Sparkles count={30} scale={1.5} size={1} speed={3} color="#ffff00" />
    </group>
  );
}

// Enhanced Artwork display component
function ArtworkDisplay({ artwork, position }: { artwork: any; position: [number, number, number] }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [error, setError] = useState(false);
  const frameRef = useRef<THREE.Mesh>(null);
  
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      artwork.image,
      (loadedTexture) => {
        setTexture(loadedTexture);
        setError(false);
      },
      undefined,
      (err) => {
        console.warn('Failed to load texture:', artwork.image, err);
        setError(true);
        // Create a fallback colored texture
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Create gradient background
          const gradient = ctx.createLinearGradient(0, 0, 256, 256);
          gradient.addColorStop(0, '#7C4DFF');
          gradient.addColorStop(1, '#9C7AFF');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 256, 256);
          
          // Add artistic pattern
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          for (let i = 0; i < 10; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 30, 0, Math.PI * 2);
            ctx.fill();
          }
          
          ctx.fillStyle = 'white';
          ctx.font = 'bold 20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('AI Art', 128, 128);
        }
        const fallbackTexture = new THREE.CanvasTexture(canvas);
        setTexture(fallbackTexture);
      }
    );
  }, [artwork.image]);

  useFrame((state) => {
    if (frameRef.current) {
      // Gentle floating animation
      frameRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.05;
    }
  });
  
  return (
    <group position={position}>
      {/* Enhanced ornate frame */}
      <mesh ref={frameRef} castShadow>
        <boxGeometry args={[1.8, 1.4, 0.15]} />
        <meshStandardMaterial 
          color="#8D6E63" 
          roughness={0.3}
          metalness={0.7}
          envMapIntensity={1}
        />
      </mesh>
      
      {/* Inner frame decoration */}
      <mesh position={[0, 0, 0.08]} castShadow>
        <boxGeometry args={[1.6, 1.2, 0.05]} />
        <meshStandardMaterial color="#FFD700" roughness={0.1} metalness={0.9} />
      </mesh>
      
      {/* Artwork canvas */}
      <mesh position={[0, 0, 0.12]}>
        <planeGeometry args={[1.4, 1]} />
        <meshStandardMaterial 
          map={texture} 
          color={error ? "#ddd" : "white"}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      {/* Glass protection with reflections */}
      <mesh position={[0, 0, 0.15]}>
        <planeGeometry args={[1.4, 1]} />
        <meshStandardMaterial 
          transparent 
          opacity={0.1}
          roughness={0}
          metalness={0.1}
          envMapIntensity={1}
        />
      </mesh>
      
      {/* Artwork lighting */}
      <spotLight
        position={[0, 2, 1]}
        target-position={position}
        angle={0.3}
        penumbra={0.5}
        intensity={0.5}
        color="#FFFFFF"
        castShadow
      />
      
      {/* Enhanced artwork info */}
      <Html position={[0, -0.9, 0]} center>
        <div className="bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs font-medium border border-white/20 shadow-lg">
          <div className="text-gold-400 font-bold">{artwork.title}</div>
          <div className="text-xs opacity-80">Digital Masterpiece</div>
        </div>
      </Html>
    </group>
  );
}

// HOLOGRAPHIC ARTWORK DISPLAY 🎨
function HolographicArt({ artwork, position, isActive }: { artwork: any; position: [number, number, number]; isActive: boolean }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const frameRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      artwork.image,
      (loadedTexture) => {
        setTexture(loadedTexture);
      },
      undefined,
      (err) => {
        // Create cyberpunk fallback
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Cyberpunk gradient
          const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
          gradient.addColorStop(0, '#ff00ff');
          gradient.addColorStop(0.5, '#00ffff');
          gradient.addColorStop(1, '#ffff00');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 512, 512);
          
          // Add circuit pattern
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 512, Math.random() * 512);
            ctx.lineTo(Math.random() * 512, Math.random() * 512);
            ctx.stroke();
          }
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 24px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('AI.ART', 256, 256);
          ctx.fillText('NEURAL_GEN', 256, 290);
        }
        const fallbackTexture = new THREE.CanvasTexture(canvas);
        setTexture(fallbackTexture);
      }
    );
  }, [artwork.image]);

  useFrame((state) => {
    if (frameRef.current && glowRef.current) {
      // Floating hologram
      frameRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3 + position[0]) * 0.1;
      frameRef.current.rotation.y += 0.005;
      
      // Glow pulsing
      const glow = 0.8 + Math.sin(state.clock.elapsedTime * 5) * 0.2;
      glowRef.current.scale.setScalar(glow);
    }
  });
  
  return (
    <group position={position}>
      {/* HOLOGRAPHIC FRAME */}
      <RoundedBox 
        ref={frameRef} 
        args={[2.5, 2, 0.1]} 
        radius={0.1} 
        castShadow
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
      >
        <meshStandardMaterial 
          color="#ffffff"
          emissive={isActive ? "#00ff88" : "#0088ff"}
          emissiveIntensity={0.5}
          metalness={1}
          roughness={0}
        />
      </RoundedBox>
      
      {/* GLOWING BORDER */}
      <RoundedBox ref={glowRef} args={[2.7, 2.2, 0.05]} radius={0.1} position={[0, 0, 0.1]}>
        <meshStandardMaterial
          color={isActive ? "#00ff88" : "#ff00ff"}
          emissive={isActive ? "#00ff88" : "#ff00ff"}
          emissiveIntensity={2}
          transparent
          opacity={0.6}
        />
      </RoundedBox>
      
      {/* ARTWORK DISPLAY */}
      <mesh position={[0, 0, 0.11]}>
        <planeGeometry args={[2.2, 1.8]} />
        <meshStandardMaterial 
          map={texture} 
          emissive="#ffffff"
          emissiveIntensity={0.3}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* HOLOGRAPHIC INTERFERENCE */}
      <mesh position={[0, 0, 0.12]}>
        <planeGeometry args={[2.2, 1.8]} />
        <meshStandardMaterial 
          color="#00ffff"
          transparent 
          opacity={0.1}
        />
      </mesh>
      
      {/* FLOATING INFO DISPLAY - Only show on hover */}
      {isHovered && (
        <Html position={[0, -1.5, 0]} center>
          <div className="bg-black/90 backdrop-blur-xl text-green-400 px-4 py-2 rounded-xl text-sm font-mono border border-green-400/50 shadow-lg shadow-green-400/25 animate-in fade-in duration-200">
            <div className="text-xs opacity-70">NEURAL_ART.dat</div>
            <div className="font-bold">{artwork.title}</div>
            <div className="text-xs text-cyan-400">HOLOGRAPHIC_RENDER</div>
          </div>
        </Html>
      )}
      
      {/* SCANNING EFFECT */}
      <Sparkles count={20} scale={2} size={1} speed={1} color="#00ffff" />
    </group>
  );
}

// CYBERPUNK REFLECTIVE GROUND WITH NEON GRID 🌆
function CyberpunkGround() {
  const groundRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (groundRef.current) {
      // Subtle pulsing effect
      const material = groundRef.current.material as THREE.MeshStandardMaterial;
      if (material.emissiveIntensity !== undefined) {
        material.emissiveIntensity = 0.1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      }
    }
  });

  return (
    <>
      {/* MAIN REFLECTIVE GROUND */}
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <MeshReflectorMaterial
          blur={[400, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={15}
          roughness={0.1}
          depthScale={1}
          minDepthThreshold={0.85}
          maxDepthThreshold={1.2}
          color="#0a0a0a"
          metalness={0.8}
          mirror={0.3}
        />
      </mesh>

      {/* NEON GRID OVERLAY */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={0.3}
          transparent
          opacity={0.1}
          wireframe
        />
      </mesh>

      {/* SUBTLE CONTACT SHADOWS */}
      <ContactShadows
        position={[0, -0.49, 0]}
        opacity={0.6}
        scale={80}
        blur={2}
        far={20}
        color="#000000"
      />
    </>
  );
}

// Simplified Ground component - no flickering
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry args={[100, 100]} />
      <meshLambertMaterial color="#4CAF50" />
    </mesh>
  );
}

// CYBERPUNK CENTRAL PLAZA 🏢
function CyberpunkPlaza() {
  const fountainRef = useRef<THREE.Mesh>(null);
  const centerRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (fountainRef.current && centerRef.current) {
      // Rotating holographic fountain
      fountainRef.current.rotation.y += 0.01;
      centerRef.current.rotation.y -= 0.005;
      
      // Pulsing effect
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      centerRef.current.scale.setScalar(pulse);
    }
  });
  
  return (
    <group>
      {/* HOLOGRAPHIC PLAZA BASE */}
      <mesh position={[0, -0.3, 0]} receiveShadow>
        <cylinderGeometry args={[12, 12, 0.6, 32]} />
        <meshStandardMaterial 
          color="#1a1a1a"
          emissive="#00ffff"
          emissiveIntensity={0.3}
          metalness={1}
          roughness={0.1}
        />
      </mesh>
      
      {/* NEON RING PATTERNS */}
      {[8, 6, 4].map((radius, i) => (
        <mesh key={i} position={[0, -0.1 + i * 0.05, 0]}>
          <ringGeometry args={[radius - 0.2, radius, 32]} />
          <meshStandardMaterial 
            color={i === 0 ? "#ff00ff" : i === 1 ? "#00ffff" : "#ffff00"}
            emissive={i === 0 ? "#ff00ff" : i === 1 ? "#00ffff" : "#ffff00"}
            emissiveIntensity={2}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
      
      {/* CENTRAL HOLOGRAPHIC CORE */}
      <mesh ref={centerRef} position={[0, 2, 0]} castShadow>
        <sphereGeometry args={[1.5, 32, 32]} />
        <MeshTransmissionMaterial
          samples={16}
          resolution={512}
          transmission={0.95}
          roughness={0}
          clearcoat={1}
          thickness={0.5}
          chromaticAberration={1}
          distortionScale={0.3}
          temporalDistortion={0.2}
          color="#00ffff"
        />
      </mesh>
      
      {/* ENERGY PILLARS */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        const x = Math.cos(angle) * 8;
        const z = Math.sin(angle) * 8;
        return (
          <Float key={i} speed={1 + i * 0.2} rotationIntensity={0.2} floatIntensity={0.5}>
            <mesh position={[x, 3, z]} castShadow>
              <cylinderGeometry args={[0.3, 0.3, 6]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#00ff88"
                emissiveIntensity={2}
                metalness={1}
                roughness={0}
              />
            </mesh>
          </Float>
        );
      })}
      
      {/* HOLOGRAPHIC FOUNTAIN */}
      <mesh ref={fountainRef} position={[0, 1, 0]} castShadow>
        <torusGeometry args={[2, 0.5, 16, 32]} />
        <meshStandardMaterial 
          color="#2196F3" 
          emissive="#2196F3"
          emissiveIntensity={1.5}
          transparent 
          opacity={0.8}
        />
      </mesh>
      
      {/* ENERGY STREAMS */}
      <Sparkles count={200} scale={8} size={2} speed={1} color="#00ffff" />
      <Sparkles count={150} scale={6} size={1.5} speed={0.8} color="#ff00ff" />
      
      {/* PLAZA LIGHTING */}
      <pointLight position={[0, 4, 0]} intensity={3} color="#00ffff" />
      <pointLight position={[0, 1, 0]} intensity={2} color="#ff00ff" />
    </group>
  );
}

// SMOOTH MOVEMENT CONTROLLER - CURSOR ALWAYS VISIBLE 🎮
function MovementController() {
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
      
      camera.position.add(movementVec);
      controlsRef.current.target.add(movementVec);
      
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

// Enhanced Loading fallback
function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-4 text-foreground">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-primary opacity-20"></div>
        </div>
        <div className="text-center">
          <div className="text-lg font-medium">Loading Medici City...</div>
          <div className="text-sm text-muted-foreground">Preparing immersive experience</div>
        </div>
      </div>
    </Html>
  );
}

// MASSIVE AGENT BUILDING HUB 🏗️
function AgentBuildingHub({ position, hubId }: { position: [number, number, number]; hubId: string }) {
  const hubRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { pinnedAgentHub, setPinnedAgentHub } = useCityStore();
  const isPinned = pinnedAgentHub === hubId;
  
  useFrame((state) => {
    if (hubRef.current && beaconRef.current) {
      // Rotating hub
      hubRef.current.rotation.y += 0.002;
      
      // Pulsing beacon
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
      beaconRef.current.scale.setScalar(pulse);
    }
  });
  
  return (
    <group ref={hubRef} position={position}>
      {/* MAIN HUB STRUCTURE */}
      <RoundedBox 
        args={[20, 15, 20]} 
        radius={1} 
        castShadow 
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          console.log('Agent Hub clicked!', hubId, 'isPinned:', isPinned);
          setPinnedAgentHub(isPinned ? null : hubId);
        }}
        onPointerEnter={() => {
          console.log('Agent Hub hovered:', hubId);
          setIsHovered(true);
        }}
        onPointerLeave={() => {
          console.log('Agent Hub unhovered:', hubId);
          setIsHovered(false);
        }}
      >
        <meshStandardMaterial
          color={isPinned ? "#ffff00" : isHovered ? "#ff0088" : "#1a1a1a"}
          emissive={isPinned ? "#ffff00" : isHovered ? "#ff0088" : "#0088ff"}
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </RoundedBox>
      
      {/* CENTRAL BEACON TOWER */}
      <mesh position={[0, 12, 0]} castShadow>
        <cylinderGeometry args={[2, 3, 24, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={isPinned ? "#ffff00" : "#00ffff"}
          emissiveIntensity={2}
          metalness={1}
          roughness={0}
        />
      </mesh>
      
      {/* BEACON CRYSTAL */}
      <mesh ref={beaconRef} position={[0, 20, 0]} castShadow>
        <octahedronGeometry args={[3]} />
        <MeshTransmissionMaterial
          samples={32}
          resolution={1024}
          transmission={0.95}
          roughness={0}
          clearcoat={1}
          thickness={0.8}
          chromaticAberration={1.5}
          distortionScale={0.5}
          temporalDistortion={0.3}
          color={isPinned ? "#ffff00" : "#00ffff"}
        />
      </mesh>
      
      {/* ENERGY RINGS AROUND BEACON */}
      {[6, 8, 10].map((radius, i) => (
        <mesh key={i} position={[0, 20, 0]} rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[radius, 0.3, 8, 32]} />
          <meshStandardMaterial
            color="#ffff00"
            emissive="#ffff00"
            emissiveIntensity={2}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
      
      {/* CORNER TOWERS */}
      {[[-8, 8], [8, 8], [-8, -8], [8, -8]].map(([x, z], i) => (
        <Float key={i} speed={1} rotationIntensity={0.1} floatIntensity={0.5}>
          <mesh position={[x, 5, z]} castShadow>
            <cylinderGeometry args={[1, 1, 10]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#00ff88"
              emissiveIntensity={1.5}
              metalness={1}
              roughness={0}
            />
          </mesh>
        </Float>
      ))}
      
      {/* INTERACTIVE HOLOGRAPHIC INTERFACE - Show when hovered or pinned */}
      {(isHovered || isPinned) && (
        <Html position={[0, 25, 0]} center>
          <div 
            className={`text-2xl font-black px-6 py-3 rounded-2xl shadow-2xl transition-all duration-500 backdrop-blur-xl ${
              isPinned
                ? 'text-yellow-400 bg-black/90 border-2 border-yellow-400 shadow-yellow-400/50'
                : isHovered
                ? 'text-pink-400 bg-black/90 border-2 border-pink-400 shadow-pink-400/50'
                : 'text-cyan-400 bg-black/90 border-2 border-cyan-400 shadow-cyan-400/50'
            } transform hover:scale-105 animate-in fade-in duration-300`}
            style={{ 
              pointerEvents: 'auto',
              zIndex: 1000,
              position: 'relative'
            }}
          >
            <div className="font-mono text-xs opacity-70">AGENT_HUB.exe</div>
            <div className="mb-2">🤖 AGENT BUILDER v3.0</div>
            
            {/* Interactive buttons when pinned */}
            {isPinned && (
              <div className="space-y-2" style={{ pointerEvents: 'auto' }}>
                <button 
                  className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition-colors cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('Entering Agent Builder');
                    alert('🤖 Welcome to the Agent Builder! Create your AI agent here.');
                  }}
                >
                  🚀 ENTER BUILDER
                </button>
                <button 
                  className="w-full px-3 py-1 bg-green-500 hover:bg-green-400 text-black text-sm rounded transition-colors cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('Creating new agent');
                    alert('✨ Starting new agent creation process!');
                  }}
                >
                  ⚡ CREATE NEW AGENT
                </button>
                <button 
                  className="w-full px-3 py-1 bg-purple-500 hover:bg-purple-400 text-white text-sm rounded transition-colors cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('Viewing agent gallery');
                    alert('🎭 AGENT GALLERY');
                  }}
                >
                  🎭 AGENT GALLERY
                </button>
                <div className="text-xs text-gray-300 text-center mt-2">
                  <div>Neural Networks: ONLINE</div>
                  <div>Quantum Processing: 99.7%</div>
                  <div>Click building again to close</div>
                </div>
              </div>
            )}
            
            {/* Show click instruction when not pinned */}
            {!isPinned && (
              <div className="text-xs text-gray-300 text-center mt-1">
                Click to pin open
              </div>
            )}
          </div>
        </Html>
      )}
      
      {/* MASSIVE PARTICLE EFFECTS */}
      <Sparkles count={300} scale={25} size={4} speed={1} color={isPinned ? "#ffff00" : "#00ffff"} />
      <Sparkles count={200} scale={15} size={2} speed={1.5} color={isPinned ? "#ffaa00" : "#ffff00"} />
      
      {/* HUB LIGHTING */}
      <pointLight position={[0, 25, 0]} intensity={5} color="#00ffff" distance={50} />
      <pointLight position={[0, 15, 0]} intensity={3} color="#ffff00" />
    </group>
  );
}

// TRADING MARKETPLACE 💰
function TradingMarketplace({ position, marketId }: { position: [number, number, number]; marketId: string }) {
  const marketRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { pinnedMarketplace, setPinnedMarketplace } = useCityStore();
  const isPinned = pinnedMarketplace === marketId;
  
  useFrame((state) => {
    if (marketRef.current) {
      // Gentle floating
      marketRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });
  
  return (
    <group ref={marketRef} position={position}>
      {/* MAIN MARKETPLACE PLATFORM */}
      <mesh 
        position={[0, 0, 0]} 
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          console.log('Marketplace clicked!', marketId, 'isPinned:', isPinned);
          setPinnedMarketplace(isPinned ? null : marketId);
        }}
        onPointerEnter={() => {
          console.log('Marketplace hovered:', marketId);
          setIsHovered(true);
        }}
        onPointerLeave={() => {
          console.log('Marketplace unhovered:', marketId);
          setIsHovered(false);
        }}
      >
        <cylinderGeometry args={[25, 25, 3, 16]} />
        <meshStandardMaterial
          color={isPinned ? "#ffff00" : isHovered ? "#ff0088" : "#2a2a2a"}
          emissive={isPinned ? "#ffff00" : isHovered ? "#ff0088" : "#ff00ff"}
          emissiveIntensity={0.3}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      
      {/* TRADING BOOTHS */}
      {Array.from({length: 8}).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.cos(angle) * 18;
        const z = Math.sin(angle) * 18;
        
        return (
          <group key={i} position={[x, 3, z]} rotation={[0, -angle, 0]}>
            <RoundedBox args={[4, 6, 2]} radius={0.2} castShadow>
              <meshStandardMaterial
                color="#ffffff"
                emissive={isPinned ? "#ffff00" : "#ff00ff"}
                emissiveIntensity={0.4}
                metalness={0.6}
                roughness={0.4}
              />
            </RoundedBox>
          </group>
        );
      })}
      
      {/* CENTRAL TRADING TERMINAL */}
      <mesh position={[0, 8, 0]} castShadow>
        <sphereGeometry args={[4, 32, 32]} />
        <MeshTransmissionMaterial
          samples={16}
          resolution={512}
          transmission={0.9}
          roughness={0.1}
          clearcoat={1}
          thickness={0.5}
          chromaticAberration={0.8}
          distortionScale={0.2}
          temporalDistortion={0.1}
          color={isPinned ? "#ffff00" : "#ff00ff"}
        />
      </mesh>
      
      {/* INTERACTIVE TRADING INTERFACE - Show when hovered or pinned */}
      {(isHovered || isPinned) && (
        <Html position={[0, 15, 0]} center>
          <div 
            className={`text-2xl font-black px-6 py-3 rounded-2xl shadow-2xl transition-all duration-500 backdrop-blur-xl ${
              isPinned
                ? 'text-yellow-400 bg-black/90 border-2 border-yellow-400 shadow-yellow-400/50'
                : isHovered
                ? 'text-pink-400 bg-black/90 border-2 border-pink-400 shadow-pink-400/50'
                : 'text-yellow-400 bg-black/90 border-2 border-yellow-400 shadow-yellow-400/50'
            } transform hover:scale-105 animate-in fade-in duration-300`}
            style={{ 
              pointerEvents: 'auto',
              zIndex: 1000,
              position: 'relative'
            }}
          >
            <div className="font-mono text-xs opacity-70">EXCHANGE.exe</div>
            <div className="mb-2">💎 MEDI EXCHANGE</div>
            
            {/* Interactive buttons when pinned */}
            {isPinned && (
              <div className="space-y-3" style={{ pointerEvents: 'auto' }}>
                {/* Live Market Data */}
                <div className="text-sm space-y-1 mb-4">
                  <div className="flex justify-between">
                    <span>$MEDI/USD</span>
                    <span className="text-green-400">$1,247.89 ↗</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AI Agents</span>
                    <span className="text-blue-400">89,432 active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Volume 24h</span>
                    <span className="text-purple-400">$2.4M</span>
                  </div>
                </div>
                
                {/* Trading Buttons */}
                <button 
                  className="w-full px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition-colors cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('Opening trading interface');
                    alert('💰 Opening MEDI Exchange trading interface!');
                  }}
                >
                  💹 START TRADING
                </button>
                <button 
                  className="w-full px-3 py-1 bg-blue-500 hover:bg-blue-400 text-white text-sm rounded transition-colors cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('Viewing wallet');
                    alert('👛 Opening your MEDI wallet!');
                  }}
                >
                  👛 MY WALLET
                </button>
                <button 
                  className="w-full px-3 py-1 bg-purple-500 hover:bg-purple-400 text-white text-sm rounded transition-colors cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('Viewing market analytics');
                    alert('📊 Opening market analytics dashboard!');
                  }}
                >
                  📊 MARKET DATA
                </button>
                <div className="text-xs text-gray-300 text-center mt-2">
                  <div>Market Status: ONLINE</div>
                  <div>Click platform again to close</div>
                </div>
              </div>
            )}
            
            {/* Show click instruction when not pinned */}
            {!isPinned && (
              <div className="text-xs text-gray-300 text-center mt-1">
                Click to pin open
              </div>
            )}
          </div>
        </Html>
      )}
      
      {/* MARKETPLACE EFFECTS */}
      <Sparkles count={400} scale={30} size={3} speed={0.8} color={isPinned ? "#ffff00" : "#ff00ff"} />
      <Sparkles count={200} scale={20} size={2} speed={1.2} color={isPinned ? "#ffaa00" : "#ffff00"} />
      
      {/* MARKETPLACE LIGHTING */}
      <pointLight position={[0, 15, 0]} intensity={4} color="#ff00ff" distance={40} />
    </group>
  );
}

// STUDIO 3D GALLERY VIEW - SICKO MODE VR EXPERIENCE 🎨🔥
function StudioGallery({ studio }: { studio: any }) {
  const { exitGalleryMode } = useCityStore();
  const galleryRef = useRef<THREE.Group>(null);
  const particleRef = useRef<THREE.Group>(null);
  
  // Real artwork URLs for the gallery
  const realArtworks = [
    {
      id: "art-1",
      title: "Neural Dreams",
      image: "https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=800&h=600&fit=crop",
      position: [0, 3, -8] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [3, 2.2, 0.1] as [number, number, number]
    },
    {
      id: "art-2", 
      title: "Digital Renaissance",
      image: "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800&h=600&fit=crop",
      position: [8, 5, -4] as [number, number, number],
      rotation: [0, -Math.PI/4, 0] as [number, number, number],
      scale: [2.5, 3, 0.1] as [number, number, number]
    },
    {
      id: "art-3",
      title: "Cyber Baroque",
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop",
      position: [-8, 2, -4] as [number, number, number],
      rotation: [0, Math.PI/4, 0] as [number, number, number],
      scale: [3.5, 2.5, 0.1] as [number, number, number]
    },
    {
      id: "art-4",
      title: "AI Abstraction",
      image: "https://images.unsplash.com/photo-1578662015879-be14ced36384?w=800&h=600&fit=crop",
      position: [5, 1, 8] as [number, number, number],
      rotation: [0, Math.PI, 0] as [number, number, number],
      scale: [2.8, 3.2, 0.1] as [number, number, number]
    },
    {
      id: "art-5",
      title: "Quantum Canvas",
      image: "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800&h=600&fit=crop",
      position: [-5, 6, 6] as [number, number, number],
      rotation: [0, -Math.PI/2, 0] as [number, number, number],
      scale: [4, 2, 0.1] as [number, number, number]
    },
    {
      id: "art-6",
      title: "Holographic Memory",
      image: "https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=800&h=600&fit=crop",
      position: [0, 8, 4] as [number, number, number],
      rotation: [Math.PI/6, 0, 0] as [number, number, number],
      scale: [3, 2.5, 0.1] as [number, number, number]
    },
    {
      id: "art-7",
      title: "Virtual Visions",
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop",
      position: [10, 3, 0] as [number, number, number],
      rotation: [0, -Math.PI/2, Math.PI/12] as [number, number, number],
      scale: [2.5, 3.5, 0.1] as [number, number, number]
    },
    {
      id: "art-8",
      title: "Data Streams",
      image: "https://images.unsplash.com/photo-1578662015879-be14ced36384?w=800&h=600&fit=crop",
      position: [-10, 4, 2] as [number, number, number],
      rotation: [0, Math.PI/2, -Math.PI/12] as [number, number, number],
      scale: [3.2, 2.8, 0.1] as [number, number, number]
    }
  ];
  
  useFrame((state) => {
    if (galleryRef.current) {
      // Gentle ambient rotation
      galleryRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
    
    if (particleRef.current) {
      particleRef.current.rotation.y += 0.001;
      particleRef.current.rotation.x += 0.0005;
    }
  });

  return (
    <>
      {/* INSANE CYBERPUNK LIGHTING SYSTEM 🌈 */}
      <ambientLight intensity={0.3} color="#0a0a2e" />
      
      {/* MAIN GALLERY SPOTLIGHTS */}
      <directionalLight position={[0, 20, 0]} intensity={2} color="#ffffff" castShadow />
      <pointLight position={[0, 15, 0]} intensity={3} color="#00ffff" distance={50} />
      <pointLight position={[15, 10, 15]} intensity={2} color="#ff00ff" distance={40} />
      <pointLight position={[-15, 10, -15]} intensity={2} color="#ffff00" distance={40} />
      <pointLight position={[0, 25, 0]} intensity={4} color="#ffffff" distance={60} />
      
      {/* NEON ACCENT LIGHTS */}
      <spotLight position={[20, 15, 0]} target-position={[0, 0, 0]} angle={0.4} intensity={3} color="#00ff88" />
      <spotLight position={[-20, 15, 0]} target-position={[0, 0, 0]} angle={0.4} intensity={3} color="#ff0088" />
      <spotLight position={[0, 15, 20]} target-position={[0, 0, 0]} angle={0.4} intensity={3} color="#8800ff" />
      
      {/* CYBERPUNK FOG */}
      <fog attach="fog" args={["#000511", 20, 100]} />
      
      {/* HOLOGRAPHIC FLOOR */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial 
          color="#001122"
          emissive="#001155"
          emissiveIntensity={0.5}
          metalness={1}
          roughness={0.1}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* NEON GRID FLOOR OVERLAY */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.9, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={1}
          transparent
          opacity={0.2}
          wireframe
        />
      </mesh>

      {/* FLOATING ENERGY CEILING */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 25, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial 
          color="#000033"
          emissive="#000066"
          emissiveIntensity={1}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* INSANE FLOATING ARTWORKS - VR STYLE */}
      <group ref={galleryRef}>
        {realArtworks.map((artwork, index) => (
          <Float key={artwork.id} speed={1 + index * 0.2} rotationIntensity={0.1} floatIntensity={0.3}>
            <group position={artwork.position} rotation={artwork.rotation}>
              {/* HOLOGRAPHIC FRAME */}
              <RoundedBox args={[artwork.scale[0] + 0.3, artwork.scale[1] + 0.3, 0.2]} radius={0.1} castShadow>
                <meshStandardMaterial 
                  color="#ffffff"
                  emissive="#00ffff"
                  emissiveIntensity={1.5}
                  metalness={1}
                  roughness={0}
                  transparent
                  opacity={0.9}
                />
              </RoundedBox>
              
              {/* GLOWING BORDER */}
              <RoundedBox 
                args={[artwork.scale[0] + 0.4, artwork.scale[1] + 0.4, 0.15]} 
                radius={0.12} 
                position={[0, 0, 0.1]}
              >
                <meshStandardMaterial
                  color="#ff00ff"
                  emissive="#ff00ff"
                  emissiveIntensity={2}
                  transparent
                  opacity={0.7}
                />
              </RoundedBox>
              
              {/* ARTWORK IMAGE */}
              <mesh position={[0, 0, 0.11]}>
                <planeGeometry args={[artwork.scale[0], artwork.scale[1]]} />
                <meshStandardMaterial 
                  map={new THREE.TextureLoader().load(artwork.image)}
                  emissive="#ffffff"
                  emissiveIntensity={0.3}
                />
              </mesh>
              
              {/* HOLOGRAPHIC INTERFERENCE PATTERN */}
              <mesh position={[0, 0, 0.12]}>
                <planeGeometry args={[artwork.scale[0], artwork.scale[1]]} />
                <meshStandardMaterial 
                  color="#00ffff"
                  transparent 
                  opacity={0.1}
                />
              </mesh>
              
              {/* INDIVIDUAL ARTWORK SPOTLIGHTS */}
              <spotLight
                position={[0, 5, 3]}
                target-position={artwork.position}
                angle={0.5}
                penumbra={0.5}
                intensity={2}
                color="#ffffff"
                castShadow
              />
              
              {/* FLOATING ARTWORK INFO */}
              <Html position={[0, -(artwork.scale[1]/2 + 1), 0]} center>
                <div className="bg-black/90 backdrop-blur-xl text-cyan-400 px-4 py-2 rounded-xl text-center border border-cyan-400/50 shadow-lg shadow-cyan-400/25 min-w-[200px]">
                  <div className="text-xs opacity-70 font-mono">NEURAL_ART.dat</div>
                  <div className="font-bold text-lg">{artwork.title}</div>
                  <div className="text-xs text-purple-400">HOLOGRAPHIC_RENDER</div>
                  <div className="text-xs opacity-60 mt-1">Studio: {studio.name}</div>
                </div>
              </Html>
              
              {/* INDIVIDUAL PARTICLE AURA */}
              <Sparkles count={30} scale={artwork.scale[0] + 2} size={1} speed={1} color="#00ffff" />
            </group>
          </Float>
        ))}
      </group>

      {/* CENTRAL STUDIO MONUMENT */}
      <Float speed={0.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <group position={[0, 12, 0]}>
          {/* FLOATING CRYSTAL */}
          <mesh>
            <octahedronGeometry args={[2]} />
            <MeshTransmissionMaterial
              samples={32}
              resolution={1024}
              transmission={0.95}
              roughness={0}
              clearcoat={1}
              thickness={1}
              chromaticAberration={1.5}
              distortionScale={0.5}
              temporalDistortion={0.3}
              color="#00ffff"
            />
          </mesh>
          
          {/* STUDIO NAME HOLOGRAM */}
          <Html position={[0, 3, 0]} center>
            <div className="bg-black/95 backdrop-blur-xl text-cyan-400 px-8 py-4 rounded-2xl text-center border-2 border-cyan-400 shadow-lg shadow-cyan-400/50 animate-pulse">
              <div className="text-3xl font-bold text-white">{studio.name}</div>
              <div className="text-lg opacity-80">Virtual Gallery</div>
              <div className="text-sm text-purple-400 mt-2">Neural Art Exhibition</div>
            </div>
          </Html>
          
          {/* ENERGY RINGS */}
          {[3, 4, 5].map((radius, i) => (
            <mesh key={i} rotation={[Math.PI / 4, 0, 0]}>
              <torusGeometry args={[radius, 0.1, 8, 32]} />
              <meshStandardMaterial
                color="#ffff00"
                emissive="#ffff00"
                emissiveIntensity={2}
                transparent
                opacity={0.8}
              />
            </mesh>
          ))}
        </group>
      </Float>

      {/* MASSIVE PARTICLE SYSTEMS */}
      <Sparkles count={1000} scale={50} size={2} speed={0.5} color="#00ffff" />
      <Sparkles count={500} scale={30} size={1.5} speed={0.8} color="#ff00ff" />
      <Sparkles count={300} scale={20} size={1} speed={1.2} color="#ffff00" />
      
      {/* FLOATING DATA STREAMS */}
      <group ref={particleRef}>
        {Array.from({length: 20}).map((_, i) => (
          <Float key={i} speed={1 + i * 0.1} rotationIntensity={0.2} floatIntensity={0.8}>
            <mesh position={[
              (Math.random() - 0.5) * 40,
              Math.random() * 20 + 5,
              (Math.random() - 0.5) * 40
            ]}>
              <sphereGeometry args={[0.2]} />
              <meshStandardMaterial
                color="#00ffff"
                emissive="#00ffff"
                emissiveIntensity={3}
                transparent
                opacity={0.8}
              />
            </mesh>
          </Float>
        ))}
      </group>

      {/* CYBERPUNK EXIT PORTAL */}
      <Float speed={2} rotationIntensity={0.3} floatIntensity={0.2}>
        <group position={[0, 3, 25]}>
          <mesh>
            <torusGeometry args={[3, 0.5, 16, 32]} />
            <meshStandardMaterial
              color="#ff0000"
              emissive="#ff0000"
              emissiveIntensity={2}
              transparent
              opacity={0.8}
            />
          </mesh>
          <Html position={[0, 0, 0]} center>
            <button 
              className="bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300 cursor-pointer shadow-lg shadow-red-500/50 border-2 border-red-500 backdrop-blur-xl"
              onClick={(e) => {
                e.stopPropagation();
                exitGalleryMode();
              }}
            >
              🚪 EXIT GALLERY
            </button>
          </Html>
          <Sparkles count={100} scale={8} size={3} speed={2} color="#ff0000" />
        </group>
      </Float>

      {/* ENHANCED GALLERY CAMERA CONTROLS */}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        enableDamping={true}
        dampingFactor={0.05}
        maxDistance={40}
        minDistance={5}
        target={[0, 8, 0]}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 6}
      />
    </>
  );
}

// SIMPLIFIED GROUND - NO FLASHING 🌍
function SimpleGround() {
  return (
    <group>
      {/* MAIN GROUND */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial 
          color="#1a1a1a"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* SIMPLE GRID OVERLAY */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.1}
          wireframe
        />
      </mesh>

      {/* CONTACT SHADOWS */}
      <ContactShadows
        position={[0, -0.48, 0]}
        opacity={0.4}
        scale={80}
        blur={1}
        far={15}
        color="#000000"
      />
    </group>
  );
}

// Main enhanced scene component
export function CityScene() {
  const { studios, initializeStudios, closeAllPinnedOverlays, currentGalleryStudio } = useCityStore();
  const [showControls, setShowControls] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  
  useEffect(() => {
    initializeStudios();
  }, [initializeStudios]);
  
  // Close pinned overlays when clicking outside
  const handleSceneClick = (e: any) => {
    // Only close if we didn't click on a building (which has stopPropagation)
    closeAllPinnedOverlays();
  };

  // Find the current studio if in gallery mode
  const currentStudio = currentGalleryStudio ? studios.find(s => s.id === currentGalleryStudio) : null;
  
  return (
    <div className="w-full h-screen relative">
      {/* CLOSEABLE CONTROL HINT */}
      {controlsVisible && (
        <div 
          className="absolute top-4 left-4 z-10"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          {!showControls ? (
            <div className="bg-black/60 backdrop-blur-sm border border-cyan-400/50 rounded-lg px-3 py-2 text-cyan-400 font-mono text-sm cursor-pointer hover:bg-black/80 transition-all flex items-center gap-2">
              🎮 Controls
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setControlsVisible(false);
                }}
                className="text-red-400 hover:text-red-300 hover:bg-red-400/20 rounded px-1 text-xs font-bold transition-all"
                title="Close controls"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="bg-black/90 backdrop-blur-xl border border-cyan-400 rounded-xl p-4 text-cyan-400 font-mono animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-bold">🎮 MEDICI CITY</div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setControlsVisible(false);
                  }}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/20 rounded px-2 py-1 text-sm font-bold transition-all"
                  title="Close controls"
                >
                  ✕
                </button>
              </div>
              <div className="text-sm space-y-1">
                <div>WASD / Arrow Keys: Move</div>
                <div>Shift: Run</div>
                <div>Space: Jump</div>
                <div className="text-yellow-400 font-bold">V: Toggle First/Third Person</div>
                <div className="text-green-400 font-bold">Mouse Wheel: Zoom</div>
                <div className="text-green-400">+/- Keys: Keyboard Zoom</div>
                <div className="text-pink-400 font-bold">Click Buildings to Interact!</div>
              </div>
            </div>
          )}
        </div>
      )}

      <KeyboardControls map={MOVEMENT_KEYS}>
        <Canvas
          camera={{ position: [8, 8, 8], fov: 75 }}
          shadows={{ type: THREE.PCFSoftShadowMap, enabled: true }}
          gl={{ 
            antialias: true, 
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.5,
            outputColorSpace: THREE.SRGBColorSpace
          }}
          onClick={handleSceneClick}
        >
          <Suspense fallback={<LoadingFallback />}>
            {currentStudio ? (
              // GALLERY MODE - Show 3D Studio Gallery
              <StudioGallery studio={currentStudio} />
            ) : (
              // CITY MODE - Show main cyberpunk city
              <>
                {/* CYBERPUNK LIGHTING SYSTEM 🌈 */}
                <ambientLight intensity={0.2} color="#0a0a2e" />
                
                {/* MAIN NEON LIGHT */}
                <directionalLight
                  position={[20, 20, 10]}
                  intensity={1.5}
                  color="#00ffff"
                  castShadow
                  shadow-mapSize-width={2048}
                  shadow-mapSize-height={2048}
                  shadow-camera-near={0.5}
                  shadow-camera-far={50}
                  shadow-camera-left={-50}
                  shadow-camera-right={50}
                  shadow-camera-top={50}
                  shadow-camera-bottom={-50}
                />
                
                {/* CYBERPUNK ACCENT LIGHTS */}
                <pointLight position={[0, 15, 0]} intensity={2} color="#ff00ff" distance={40} />
                <pointLight position={[15, 8, 15]} intensity={1.5} color="#00ff88" distance={25} />
                <pointLight position={[-15, 8, -15]} intensity={1.5} color="#ffff00" distance={25} />
                <pointLight position={[0, 5, 20]} intensity={1} color="#ff0088" distance={30} />
                <pointLight position={[0, 5, -20]} intensity={1} color="#8800ff" distance={30} />
                
                {/* ATMOSPHERIC EFFECTS */}
                <fog attach="fog" args={["#0a0a2e", 30, 150]} />
                
                {/* FUTURISTIC ENVIRONMENT */}
                <Environment preset="night" />
                
                {/* CYBERPUNK SKY */}
                <Sky 
                  distance={450000}
                  sunPosition={[0, -0.5, 0]}
                  inclination={0.8}
                  azimuth={0.5}
                  turbidity={20}
                  rayleigh={1}
                />
                
                {/* NEON STARS */}
                <Stars radius={200} depth={50} count={2000} factor={8} saturation={1} fade speed={2} />
                
                {/* FLOATING NEON CLOUDS */}
                <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.3}>
                  <Cloud position={[30, 20, -30]} speed={0.1} opacity={0.2} color="#ff00ff" />
                </Float>
                <Float speed={0.3} rotationIntensity={0.1} floatIntensity={0.2}>
                  <Cloud position={[-40, 15, 20]} speed={0.08} opacity={0.15} color="#00ffff" />
                </Float>
                
                {/* CYBERPUNK GROUND */}
                <SimpleGround />
                
                {/* FUTURISTIC STUDIOS */}
                {studios.map((studio) => (
                  <StudioBuilding key={studio.id} studio={studio} />
                ))}
                
                {/* ENHANCED CENTRAL PLAZA */}
                <CyberpunkPlaza />
                
                {/* SINGLE AGENT BUILDING HUB */}
                <AgentBuildingHub position={[60, 0, 60]} hubId="hub1" />
                
                {/* SINGLE TRADING MARKETPLACE */}
                <TradingMarketplace position={[0, 5, 80]} marketId="market1" />
                
                {/* ATMOSPHERIC PARTICLES */}
                <Sparkles count={500} scale={100} size={3} speed={0.5} color="#00ffff" />
                <Sparkles count={300} scale={60} size={2} speed={0.8} color="#ff00ff" />
                <Sparkles count={200} scale={40} size={1} speed={1.2} color="#ffff00" />
                
                <MovementController />
              </>
            )}
          </Suspense>
        </Canvas>
      </KeyboardControls>
    </div>
  );
} 