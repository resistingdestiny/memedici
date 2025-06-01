"use client";

import { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, Flag, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useWallet } from '@/lib/stores/use-wallet';
import { submitFeedback, DatasetFeedbackRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryId: string;
  agentName: string;
  responseText: string;
}

const FLAG_OPTIONS = [
  { id: 'inappropriate', label: 'Inappropriate Content', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  { id: 'low_quality', label: 'Low Quality', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  { id: 'copyright_violation', label: 'Copyright Issue', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
];

export function FeedbackModal({ isOpen, onClose, entryId, agentName, responseText }: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { isConnected, address } = useWallet();
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleFlagToggle = (flagId: string) => {
    setSelectedFlags(prev => 
      prev.includes(flagId) 
        ? prev.filter(f => f !== flagId)
        : [...prev, flagId]
    );
  };

  const generateSignedMessage = async (entryId: string, rating: number): Promise<{ signedMessage: string; signature: string } | null> => {
    if (!window.ethereum || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      const message = `${entryId}:${rating}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      return { signedMessage: message, signature };
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to submit feedback.",
        variant: "destructive",
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please provide a star rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const signatureData = await generateSignedMessage(entryId, rating);
      if (!signatureData) {
        throw new Error('Failed to sign message');
      }

      const feedbackData: DatasetFeedbackRequest = {
        entry_id: entryId,
        rating,
        flags: selectedFlags,
        comments: comments.trim() || undefined,
        helpful: helpful ?? true,
        wallet_address: address,
        signed_message: signatureData.signedMessage,
        signature: signatureData.signature,
      };

      const result = await submitFeedback(feedbackData);
      
      if (result.success) {
        toast({
          title: "Feedback Submitted",
          description: "Thank you for your feedback! You may earn token rewards.",
        });
        onClose();
      } else {
        throw new Error(result.error || 'Failed to submit feedback');
      }
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Rate Response from {agentName}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Response Preview */}
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Agent Response:</p>
            <p className="text-sm line-clamp-3">{responseText}</p>
          </div>

          {/* Star Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rate this response (1-5 stars) *</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 hover:scale-110 transition-transform"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating > 0 && (
                  rating === 1 ? 'Poor' :
                  rating === 2 ? 'Fair' :
                  rating === 3 ? 'Good' :
                  rating === 4 ? 'Very Good' :
                  'Excellent'
                )}
              </span>
            </div>
          </div>

          {/* Helpful Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Was this response helpful?</label>
            <div className="flex gap-2">
              <Button
                variant={helpful === true ? "default" : "outline"}
                size="sm"
                onClick={() => setHelpful(true)}
                className="flex items-center gap-2"
              >
                <ThumbsUp className="h-4 w-4" />
                Helpful
              </Button>
              <Button
                variant={helpful === false ? "default" : "outline"}
                size="sm"
                onClick={() => setHelpful(false)}
                className="flex items-center gap-2"
              >
                <ThumbsDown className="h-4 w-4" />
                Not Helpful
              </Button>
            </div>
          </div>

          {/* Issue Flags */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Report Issues (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {FLAG_OPTIONS.map((flag) => (
                <Badge
                  key={flag.id}
                  variant={selectedFlags.includes(flag.id) ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    selectedFlags.includes(flag.id) ? flag.color : ''
                  }`}
                  onClick={() => handleFlagToggle(flag.id)}
                >
                  {flag.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Comments (optional)</label>
            <Textarea
              placeholder="Share your thoughts about this response..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comments.length}/500 characters
            </p>
          </div>

          {/* Wallet Connection Status */}
          {!isConnected && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
              <p className="text-sm text-orange-600 dark:text-orange-400">
                ⚠️ Connect your wallet to submit feedback and earn potential token rewards.
              </p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!isConnected || rating === 0 || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 