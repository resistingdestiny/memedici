"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Box, Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { useListAgents } from '@/hooks/useListAgents';

interface CyberpunkAgentProps {
  agentId: string;
  position: [number, number, number];
  isActive: boolean;
  onAgentClick?: (agent: any) => void;
}

export function CyberpunkAgent({ agentId, position, isActive, onAgentClick }: CyberpunkAgentProps) {
  // Only keep essential refs for animation
  const groupRef = useRef<THREE.Group>(null);
  const platformRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const avatarRingRef = useRef<THREE.Mesh>(null);
  const nameTextRef = useRef<THREE.Mesh>(null);
  
  // Get real agents from the deployed backend
  const { data: realAgents, isLoading } = useListAgents();
  
  // Find the agent by ID
  const agentData = realAgents.find(agent => agent.id === agentId);
  
  // Default values if agent not found
  const displayData = {
    name: agentData?.display_name || agentId,
    avatar: agentData?.avatar || `https://api.dicebear.com/7.x/avatars/svg?seed=${agentId}`,
    personality: agentData?.archetype || "Creative AI",
    experience: agentData?.collective || "Independent",
    greeting: `Hello! I am ${agentData?.display_name || agentId}, ready to create amazing art!`,
    description: agentData?.origin_story || "A creative AI agent specializing in digital art.",
    stats: {
      "Art Created": agentData?.stats?.artworksCreated || 0,
      "Interactions": agentData?.stats?.promptsHandled || 0,
      "Style": agentData?.primary_mediums?.[0] || "Digital",
      "Medium": agentData?.core_traits?.[0] || "Creative",
      "Experience": agentData?.collective || "Emerging"
    }
  };

  // Base colors
  const primaryColor = isActive ? '#00ff9f' : '#4a9eff';
  const secondaryColor = isActive ? '#00d4ff' : '#7c3aed';
  
  // Floating animation
  const baseY = position[1];
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = baseY + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      
      if (isActive) {
        groupRef.current.rotation.y += 0.01;
      }
    }
    
    if (coreRef.current && isActive) {
      coreRef.current.rotation.x += 0.02;
      coreRef.current.rotation.z += 0.01;
    }
    
    if (avatarRingRef.current) {
      avatarRingRef.current.rotation.z += isActive ? 0.02 : 0.005;
    }
  });

  const handleClick = (event: any) => {
    event.stopPropagation();
    if (onAgentClick && agentData) {
      onAgentClick({
        ...displayData,
        id: agentId,
        agentData: agentData
      });
    }
  };

  if (isLoading) {
    return (
      <group ref={groupRef} position={position}>
        {/* Loading state */}
        <Sphere args={[0.5, 8, 8]} position={[0, 1.5, 0]}>
          <meshStandardMaterial color="#666" opacity={0.5} transparent />
        </Sphere>
        <Text
          position={[0, 0.5, 0]}
          fontSize={0.2}
          color="#999"
          anchorX="center"
          anchorY="middle"
        >
          Loading...
        </Text>
      </group>
    );
  }

  return (
    <group ref={groupRef} position={position} onClick={handleClick}>
      {/* Base Platform */}
      <Cylinder
        ref={platformRef}
        args={[1.2, 1.2, 0.1, 16]}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          color={primaryColor}
          emissive={primaryColor}
          emissiveIntensity={0.2}
          transparent
          opacity={0.8}
        />
      </Cylinder>
      
      {/* Core Hologram */}
      <Box
        ref={coreRef}
        args={[0.3, 0.3, 0.3]}
        position={[0, 1.5, 0]}
      >
        <meshStandardMaterial
          color={primaryColor}
          emissive={primaryColor}
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
          wireframe
        />
      </Box>
      
      {/* Avatar Ring */}
      <Cylinder
        ref={avatarRingRef}
        args={[0.7, 0.7, 0.05, 16]}
        position={[0, 1.5, 0]}
      >
        <meshStandardMaterial
          color={secondaryColor}
          emissive={secondaryColor}
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
        />
      </Cylinder>
      
      {/* Agent Name */}
      <Text
        ref={nameTextRef}
        position={[0, 0.5, 0]}
        fontSize={0.15}
        color={primaryColor}
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
      >
        {displayData.name}
      </Text>
      
      {/* Agent Type */}
      <Text
        position={[0, 0.2, 0]}
        fontSize={0.1}
        color="#ccc"
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
      >
        {displayData.personality}
      </Text>
      
      {/* Stats Display */}
      <Text
        position={[0, -0.1, 0]}
        fontSize={0.08}
        color="#aaa"
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
      >
        ✨ {displayData.stats["Art Created"]} • 💬 {displayData.stats["Interactions"]}
      </Text>
      
      {/* Interactive Glow */}
      {isActive && (
        <Sphere args={[1.5, 16, 16]} position={[0, 1, 0]}>
          <meshStandardMaterial
            color={primaryColor}
            transparent
            opacity={0.1}
            emissive={primaryColor}
            emissiveIntensity={0.1}
          />
        </Sphere>
      )}
    </group>
  );
} 