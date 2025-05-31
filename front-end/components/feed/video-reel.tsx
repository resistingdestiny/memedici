"use client";

import { useRef, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { type FeedItem } from "@/lib/types";
import { useFeed } from "@/lib/stores/use-feed";

interface VideoReelProps {
  item: FeedItem;
}

export function VideoReel({ item }: VideoReelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ref, inView } = useInView({
    threshold: 0.5,
  });
  
  const likeItem = useFeed((state) => state.likeItem);
  
  useEffect(() => {
    if (!videoRef.current) return;
    
    if (inView) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, [inView]);
  
  return (
    <Card
      ref={ref}
      className="relative aspect-[9/16] overflow-hidden"
    >
      {inView && (
        <video
          ref={videoRef}
          src={item.media}
          className="w-full h-full object-cover"
          loop
          muted
          playsInline
        />
      )}
      
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/90">
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-3 mb-4">
            <Avatar>
              <AvatarImage src={item.creator.avatar} />
              <AvatarFallback>{item.creator.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-white">{item.creator.name}</p>
              <p className="text-sm text-white/70">{item.title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full bg-background/20 ${
                item.isLiked ? "text-red-500" : "text-white"
              }`}
              onClick={() => likeItem(item.id)}
            >
              <Heart className="h-5 w-5" />
            </Button>
            <span className="text-sm text-white">{item.likes} likes</span>
          </div>
        </div>
      </div>
    </Card>
  );
}