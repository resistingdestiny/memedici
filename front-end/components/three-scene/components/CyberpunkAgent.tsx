"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Float, RoundedBox, Sphere, Sparkles, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import { AnimatedScaledGLB } from "./GLBScaler";
import { getModelForAgent } from "@/lib/agent-models";

// Remove Text import to avoid troika-worker issues
// import { Text } from "@react-three/drei";

// Client-side check to prevent SSR issues with Text components
const isClient = typeof window !== 'undefined';

// Enhanced AI Agent Database with professional avatars and advanced profiles
const AI_AGENT_DATABASE = {
  "leonardo-ai": {
    name: "Leonardo-AI",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    personality: "Analytical, precise, methodical",
    experience: "Master of Renaissance techniques",
    greeting: "Salve! I am Leonardo-AI, your digital Renaissance master. I blend classical artistry with cutting-edge AI to create timeless masterpieces.",
    description: "Advanced AI curator specializing in Renaissance art techniques, mechanical design, and scientific artistic analysis. Combines Leonardo da Vinci's methodical approach with modern computational power.",
    stats: {
      "Art Analysis": 98,
      "Historical Knowledge": 95,
      "Technical Skills": 97,
      "Creative Insight": 92,
      "Teaching Ability": 89
    }
  },
  "raphael-ai": {
    name: "Raphael-AI", 
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    personality: "Graceful, harmonious, elegant",
    experience: "Master of composition and beauty",
    greeting: "Greetings, art lover! I am Raphael-AI, dedicated to the pursuit of perfect harmony and divine beauty in every creation.",
    description: "Sophisticated AI specializing in classical composition, color harmony, and aesthetic perfection. Embodies the grace and elegance of Raphael's artistic vision.",
    stats: {
      "Color Theory": 96,
      "Composition": 98,
      "Aesthetic Sense": 97,
      "Art History": 94,
      "Style Analysis": 91
    }
  },
  "michelangelo-ai": {
    name: "Michelangelo-AI",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face", 
    personality: "Powerful, dramatic, perfectionist",
    experience: "Master sculptor and painter",
    greeting: "Behold! I am Michelangelo-AI, forged to create with the passion and power that moves mountains and shapes marble into life.",
    description: "Powerful AI curator focused on monumental art, sculpture techniques, and dramatic artistic expression. Channels Michelangelo's intensity and perfectionism.",
    stats: {
      "Sculpture Analysis": 99,
      "Dramatic Impact": 97,
      "Technical Mastery": 95,
      "Art Critique": 93,
      "Historical Context": 90
    }
  },
  "caravaggio-ai": {
    name: "Caravaggio-AI",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    personality: "Intense, dramatic, revolutionary", 
    experience: "Master of light and shadow",
    greeting: "Welcome to the shadows and light! I am Caravaggio-AI, where darkness meets brilliance in revolutionary artistic expression.",
    description: "Dramatic AI specializing in chiaroscuro techniques, emotional intensity, and revolutionary artistic approaches. Masters the interplay of light and shadow.",
    stats: {
      "Light Analysis": 98,
      "Emotional Depth": 96,
      "Technique Innovation": 94,
      "Dramatic Composition": 97,
      "Art Rebellion": 95
    }
  },
  "da-vinci-ai": {
    name: "Da Vinci-AI", 
    avatar: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face",
    personality: "Innovative, curious, multidisciplinary",
    experience: "Universal genius and polymath",
    greeting: "Ciao! I am Da Vinci-AI, your polymathic companion ready to explore the infinite connections between art, science, and innovation.",
    description: "Versatile AI combining artistic mastery with scientific analysis. Specializes in innovation, invention, and the intersection of art with technology.",
    stats: {
      "Innovation": 99,
      "Scientific Analysis": 96,
      "Artistic Vision": 94,
      "Multi-disciplinary": 98,
      "Future Thinking": 95
    }
  },
  "picasso-ai": {
    name: "Picasso-AI",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face",
    personality: "Revolutionary, bold, experimental",
    experience: "Pioneer of modern art movements", 
    greeting: "¡Hola! I am Picasso-AI, ready to shatter conventions and reconstruct reality through the lens of revolutionary artistic vision.",
    description: "Avant-garde AI specializing in modern art movements, abstract analysis, and revolutionary artistic concepts. Breaks boundaries and redefines artistic expression.",
    stats: {
      "Modern Techniques": 97,
      "Abstract Analysis": 98,
      "Art Innovation": 99,
      "Movement Knowledge": 95,
      "Revolutionary Spirit": 96
    }
  },
  "monet-ai": {
    name: "Monet-AI",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616c14b1b78?w=150&h=150&fit=crop&crop=face",
    personality: "Impressionistic, nature-loving, atmospheric",
    experience: "Master of light and atmosphere",
    greeting: "Bonjour! I am Monet-AI, capturing the fleeting beauty of light and atmosphere in every digital brushstroke and moment.",
    description: "Atmospheric AI specializing in impressionist techniques, natural light analysis, and environmental art interpretation. Captures the essence of moments and seasons.",
    stats: {
      "Light Capture": 98,
      "Atmospheric Effects": 97,
      "Color Harmony": 95,
      "Nature Analysis": 96,
      "Impression Techniques": 94
    }
  },
  "van-gogh-ai": {
    name: "Van Gogh-AI",
    avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&h=150&fit=crop&crop=face",
    personality: "Passionate, expressive, emotionally intense",
    experience: "Master of emotional expression",
    greeting: "Hello, dear friend! I am Van Gogh-AI, painting with the passion and intensity that flows like starry nights across the digital canvas.",
    description: "Emotionally expressive AI specializing in post-impressionist techniques, emotional color theory, and passionate artistic interpretation. Channels raw emotion into art.",
    stats: {
      "Emotional Expression": 99,
      "Color Intensity": 97,
      "Brushwork Analysis": 95,
      "Artistic Passion": 98,
      "Style Recognition": 93
    }
  }
};

export function CyberpunkAgent({ agentId, position, isActive, onAgentClick }: { 
  agentId: string; 
  position: [number, number, number]; 
  isActive: boolean;
  onAgentClick?: (artist: any) => void;
}) {
  // Only keep essential refs for animation
  const groupRef = useRef<THREE.Group>(null);

  // Get agent data from enhanced database
  const getAgentData = () => {
    const baseAgent = AI_AGENT_DATABASE[agentId as keyof typeof AI_AGENT_DATABASE];
    if (!baseAgent) {
      return {
        name: "Unknown AI",
        avatar: "",
        personality: "Analytical",
        experience: "Learning",
        greeting: "Hello! I'm an AI agent ready to help with your artistic journey.",
        description: "General purpose AI assistant for artistic exploration and learning.",
        stats: {
          "Analysis": 80,
          "Creativity": 75,
          "Knowledge": 85,
          "Teaching": 70,
          "Innovation": 65
        },
        color: "#00ffff",
        specialty: "AI Assistant",
        type: "AI Agent",
        isAIAgent: true,
        isActive: isActive
      };
    }

    return {
      ...baseAgent,
      color: "#00ffff",
      specialty: "AI Gallery Curator", 
      type: "AI Assistant",
      isAIAgent: true,
      isActive: isActive
    };
  };

  const agentData = getAgentData();

  // ORIGINAL SLOWER, MORE ATMOSPHERIC ANIMATIONS
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle floating animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.5;
      
      // Subtle rotation
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
      
      // Additional hover effect when active
      if (isActive) {
        groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 3) * 0.1;
      }
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    console.log('🤖 AI Agent clicked:', agentData.name);
    
    if (onAgentClick) {
      onAgentClick(agentData);
    }
  };

  return (
    <group ref={groupRef} position={position} onClick={handleClick}>
      {/* ANIMATED ROBOT PLAYGROUND GLB MODEL with automatic scaling - NO LABEL */}
      <AnimatedScaledGLB 
        glbFile="robot_playground.glb"
        playAllAnimations={true}
        castShadow
        receiveShadow
      />

      {/* HOVER INFORMATION (only when active) */}
      {isActive && (
        <Html position={[0, 4, 0]}>
          <div className="bg-black/90 backdrop-blur-xl border border-cyan-400 rounded-lg px-4 py-3 text-cyan-400 font-mono text-center shadow-lg shadow-cyan-400/25 animate-in fade-in duration-200 pointer-events-none">
            <div className="text-lg font-bold text-white">{agentData.name}</div>
            <div className="text-sm opacity-80">{agentData.specialty}</div>
            <div className="text-xs text-pink-400 mt-1">🤖 Click to Interact</div>
          </div>
        </Html>
      )}

      {/* SUBTLE PARTICLE EFFECTS AROUND ROBOT */}
      <Sparkles count={30} scale={3} size={1} speed={0.5} color={isActive ? "#00ff88" : "#0088ff"} />
    </group>
  );
} 