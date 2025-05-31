"use client";

import { useInView } from "react-intersection-observer";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, Bookmark, Play, ShoppingBag } from "lucide-react";
import { type FeedItem } from "@/lib/types";
import { useFeed } from "@/lib/stores/use-feed";
import { agentData } from "@/lib/stubs";

interface ImageCardProps {
  item: FeedItem;
}

export function ImageCard({ item }: ImageCardProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  
  const likeItem = useFeed((state) => state.likeItem);
  
  // Get agent data for collective info
  const agent = item.creator.agentId ? agentData.find(a => a.id === item.creator.agentId) : null;
  
  return (
    <Card
      ref={ref}
      className="overflow-hidden group cursor-pointer"
    >
      <div className="relative aspect-auto overflow-hidden">
        {inView && (
          <>
            <Image
              src={item.media}
              alt={item.title}
              width={800}
              height={1200}
              className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {item.type === "video" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-background/80 flex items-center justify-center">
                  <Play className="h-6 w-6" />
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {item.creator.agentId ? (
                      <Link href={`/agents/${item.creator.agentId}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <Avatar className="h-8 w-8 ring-2 ring-background">
                          <AvatarImage src={item.creator.avatar} />
                          <AvatarFallback>{item.creator.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-white">{item.creator.name}</p>
                          <p className="text-xs text-white/70">AI Artist</p>
                          {agent && (
                            <p className="text-xs text-white/60">{agent.collective}</p>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 ring-2 ring-background">
                          <AvatarImage src={item.creator.avatar} />
                          <AvatarFallback>{item.creator.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-white">{item.creator.name}</p>
                          <p className="text-xs text-white/70">AI Artist</p>
                          {agent && (
                            <p className="text-xs text-white/60">{agent.collective}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {item.type === "product" && item.price && (
                    <Button size="sm" className="bg-primary/90 hover:bg-primary">
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      ${item.price}
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="secondary" className="bg-background/20">
                    {item.type === "video" ? "Video" : item.type === "product" ? "Product" : "Image"}
                  </Badge>
                  {["AI", "Art", "Digital"].map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-background/20">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-white/90 line-clamp-2">{item.title}</p>
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className={item.isLiked ? "text-red-500" : ""}
              onClick={() => likeItem(item.id)}
            >
              <Heart className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
          <Button variant="ghost" size="icon">
            <Bookmark className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {item.creator.agentId ? (
            <Link href={`/agents/${item.creator.agentId}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Avatar className="h-6 w-6">
                <AvatarImage src={item.creator.avatar} />
                <AvatarFallback>{item.creator.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium truncate">{item.creator.name}</p>
                {agent && (
                  <p className="text-xs text-muted-foreground">{agent.collective}</p>
                )}
              </div>
            </Link>
          ) : (
            <>
              <Avatar className="h-6 w-6">
                <AvatarImage src={item.creator.avatar} />
                <AvatarFallback>{item.creator.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium truncate">{item.creator.name}</p>
                {agent && (
                  <p className="text-xs text-muted-foreground">{agent.collective}</p>
                )}
              </div>
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {item.likes.toLocaleString()} likes
        </p>
      </div>
    </Card>
  );
}