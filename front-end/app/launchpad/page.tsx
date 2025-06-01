"use client";

import React, { useState } from 'react';
import AgentLaunchpad from '@/components/agent-launchpad/AgentLaunchpad';

export default function LaunchpadPage() {
  const [showLaunchpad, setShowLaunchpad] = useState(true);

  if (!showLaunchpad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">🚀 Agent Launchpad</h1>
          <p className="text-gray-400 mb-8">Launch and trade AI agents on Flow Testnet</p>
          <button 
            onClick={() => setShowLaunchpad(true)}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Open Launchpad
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <AgentLaunchpad onClose={() => window.close()} />
    </div>
  );
} 