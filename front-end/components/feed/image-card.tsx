"use client";

import { useInView } from "react-intersection-observer";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, Bookmark, Play, ShoppingBag, Calendar, Cpu, Building2 } from "lucide-react";
import { type FeedItem } from "@/lib/types";
import { useFeed } from "@/lib/stores/use-feed";

interface ImageCardProps {
  item: FeedItem;
}

export function ImageCard({ item }: ImageCardProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  
  const likeItem = useFeed((state) => state.likeItem);
  
  // Format creation date
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
              onError={(e) => {
                // Fallback for broken images
                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f0f0f0'/%3E%3Ctext x='200' y='150' text-anchor='middle' dy='.35em' font-family='Arial, sans-serif' font-size='16' fill='%23666'%3EArtwork%3C/text%3E%3C/svg%3E";
              }}
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
                          {item.studioName && (
                            <p className="text-xs text-white/60 flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {item.studioName}
                            </p>
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
                          {item.studioName && (
                            <p className="text-xs text-white/60 flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {item.studioName}
                            </p>
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
                  {item.artStyle && (
                    <Badge variant="secondary" className="bg-background/20">
                      {item.artStyle}
                    </Badge>
                  )}
                  {item.modelName && (
                    <Badge variant="secondary" className="bg-background/20 flex items-center gap-1">
                      <Cpu className="h-3 w-3" />
                      {item.modelName}
                    </Badge>
                  )}
                  {formatDate(item.createdAt) && (
                    <Badge variant="secondary" className="bg-background/20 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.createdAt)}
                    </Badge>
                  )}
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
                {item.studioName && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {item.studioName}
                  </p>
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
                {item.studioName && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {item.studioName}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-muted-foreground">
            {item.likes.toLocaleString()} likes
          </p>
          {formatDate(item.createdAt) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(item.createdAt)}
            </p>
          )}
        </div>
        {item.modelName && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Cpu className="h-3 w-3" />
            {item.modelName}
          </p>
        )}
      </div>
    </Card>
  );
}