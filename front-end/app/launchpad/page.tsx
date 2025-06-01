"use client";

import React from 'react';
import AgentLaunchpad from '@/components/agent-launchpad/AgentLaunchpad';
import { useRouter } from 'next/navigation';

export default function LaunchpadPage() {
  const router = useRouter();

  const handleClose = () => {
    router.push('/city'); // Navigate back to city or main page
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <AgentLaunchpad onClose={handleClose} />
    </div>
  );
} 