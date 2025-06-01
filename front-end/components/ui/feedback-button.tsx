"use client";

import { useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeedbackModal } from './feedback-modal';

interface FeedbackButtonProps {
  entryId: string;
  agentName: string;
  responseText: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function FeedbackButton({ 
  entryId, 
  agentName, 
  responseText, 
  size = "sm", 
  variant = "ghost",
  className = ""
}: FeedbackButtonProps) {
  const [showModal, setShowModal] = useState(false);

  // Don't show feedback button if there's no entryId
  if (!entryId) {
    return null;
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1 ${className}`}
        title="Rate this response"
      >
        <Star className="h-3 w-3" />
        <span className="text-xs">Rate</span>
      </Button>

      <FeedbackModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        entryId={entryId}
        agentName={agentName}
        responseText={responseText}
      />
    </>
  );
} 