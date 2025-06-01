"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Heart, Share2, Download, Calendar, Cpu, Building2 } from "lucide-react";
import { type FeedItem } from "@/lib/types";
import Link from "next/link";

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  items: FeedItem[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export function Lightbox({ isOpen, onClose, items, currentIndex, onNavigate }: LightboxProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const currentItem = items[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (currentIndex > 0) {
            onNavigate(currentIndex - 1);
          }
          break;
        case "ArrowRight":
          if (currentIndex < items.length - 1) {
            onNavigate(currentIndex + 1);
          }
          break;
        case " ":
          if (currentItem?.type === "video") {
            e.preventDefault();
            setIsPlaying(!isPlaying);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, items.length, onNavigate, onClose, currentItem, isPlaying]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return null;
    }
  };

  if (!currentItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 gap-0 overflow-hidden">
        <div className="relative flex h-full">
          {/* Navigation Controls */}
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-background/80 hover:bg-background"
              onClick={() => onNavigate(currentIndex - 1)}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          
          {currentIndex < items.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-background/80 hover:bg-background"
              onClick={() => onNavigate(currentIndex + 1)}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-50 bg-background/80 hover:bg-background"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Media Content */}
          <div className="flex-1 flex items-center justify-center bg-black/95 min-h-[400px] relative">
            {currentItem.type === "video" ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  key={currentItem.id}
                  src={currentItem.media}
                  className="max-w-full max-h-full object-contain"
                  controls={isPlaying}
                  autoPlay={isPlaying}
                  muted={isMuted}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                
                {/* Video Controls Overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-background/80 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMuted(!isMuted)}
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                  </div>
                  <Badge variant="secondary">Video</Badge>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src={currentItem.media}
                  alt={currentItem.title}
                  width={1920}
                  height={1080}
                  className="max-w-full max-h-full object-contain"
                  priority
                />
              </div>
            )}
          </div>

          {/* Sidebar with Details */}
          <div className="w-80 bg-background border-l flex flex-col">
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex items-center gap-3 mb-3">
                {currentItem.creator.agentId ? (
                  <Link href={`/agents/${currentItem.creator.agentId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={currentItem.creator.avatar} />
                      <AvatarFallback>{currentItem.creator.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{currentItem.creator.name}</p>
                      <p className="text-sm text-muted-foreground">AI Artist</p>
                      {currentItem.studioName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {currentItem.studioName}
                        </p>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={currentItem.creator.avatar} />
                      <AvatarFallback>{currentItem.creator.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{currentItem.creator.name}</p>
                      <p className="text-sm text-muted-foreground">AI Artist</p>
                      {currentItem.studioName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {currentItem.studioName}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <h2 className="text-lg font-semibold mb-2">{currentItem.title}</h2>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Heart className="h-4 w-4 mr-2" />
                  {currentItem.likes.toLocaleString()}
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {/* Metadata Badges */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Details</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {currentItem.type === "video" ? "Video" : currentItem.type === "product" ? "Product" : "Image"}
                  </Badge>
                  {currentItem.artStyle && (
                    <Badge variant="outline">{currentItem.artStyle}</Badge>
                  )}
                  {currentItem.modelName && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Cpu className="h-3 w-3" />
                      {currentItem.modelName}
                    </Badge>
                  )}
                  {formatDate(currentItem.createdAt) && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(currentItem.createdAt)}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Navigation Info */}
              <div className="text-sm text-muted-foreground">
                <p>{currentIndex + 1} of {items.length} artworks</p>
                <p className="text-xs mt-1">Use arrow keys or buttons to navigate</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 