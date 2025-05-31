"use client";

import { useState } from "react";
import Image from "next/image";
import Masonry from "react-masonry-css";
import InfiniteScroll from "react-infinite-scroll-component";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, ShoppingCart } from "lucide-react";

interface MarketplaceItem {
  id: string;
  type: "image" | "video" | "product";
  title: string;
  description: string;
  media: string;
  price?: number;
  likes: number;
  comments: number;
  creator: {
    name: string;
    avatar: string;
    verified: boolean;
  };
  tags: string[];
}

const breakpointColumns = {
  default: 4,
  1536: 4,
  1280: 3,
  1024: 3,
  768: 2,
  640: 2,
  480: 1,
};

// Mock data generator
function generateMockItems(count: number): MarketplaceItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    type: ["image", "video", "product"][Math.floor(Math.random() * 3)] as "image" | "video" | "product",
    title: `Creation #${i + 1}`,
    description: "A beautiful piece created by our AI artist",
    media: `https://picsum.photos/seed/${i}/400/${Math.floor(Math.random() * 200 + 300)}`,
    price: Math.random() > 0.5 ? Math.floor(Math.random() * 1000) + 50 : undefined,
    likes: Math.floor(Math.random() * 1000),
    comments: Math.floor(Math.random() * 100),
    creator: {
      name: `Creator ${i % 10 + 1}`,
      avatar: `https://api.dicebear.com/7.x/avatars/svg?seed=${i}`,
      verified: Math.random() > 0.7,
    },
    tags: ["AI", "Art", "Digital", "NFT"].sort(() => Math.random() - 0.5).slice(0, 2),
  }));
}

interface MarketplaceFeedProps {
  viewMode: "grid" | "list" | "video";
}

export function MarketplaceFeed({ viewMode }: MarketplaceFeedProps) {
  const [items, setItems] = useState<MarketplaceItem[]>(() => generateMockItems(20));
  const [hasMore, setHasMore] = useState(true);

  const fetchMoreData = () => {
    const newItems = generateMockItems(10);
    setItems((prev) => [...prev, ...newItems]);
    if (items.length > 100) setHasMore(false);
  };

  const GridItem = ({ item }: { item: MarketplaceItem }) => (
    <Card className="overflow-hidden group">
      <div className="relative aspect-[4/5] overflow-hidden">
        <Image
          src={item.media}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={item.creator.avatar} />
                <AvatarFallback>{item.creator.name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{item.creator.name}</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            {item.price && (
              <Button size="sm" className="w-full">
                <ShoppingCart className="h-4 w-4 mr-2" />
                ${item.price}
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-medium mb-1">{item.title}</h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <button className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Heart className="h-4 w-4" />
            {item.likes}
          </button>
          <button className="flex items-center gap-1 hover:text-foreground transition-colors">
            <MessageCircle className="h-4 w-4" />
            {item.comments}
          </button>
          <button className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );

  return (
    <InfiniteScroll
      dataLength={items.length}
      next={fetchMoreData}
      hasMore={hasMore}
      loader={<div className="text-center py-4">Loading...</div>}
      endMessage={<div className="text-center py-4">No more items to load.</div>}
      className="w-full"
    >
      {viewMode === "grid" && (
        <Masonry
          breakpointCols={breakpointColumns}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4 bg-clip-padding"
        >
          {items.map((item) => (
            <div key={item.id} className="mb-4">
              <GridItem item={item} />
            </div>
          ))}
        </Masonry>
      )}
      
      {viewMode === "list" && (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex gap-4">
                <div className="relative w-48 h-48">
                  <Image
                    src={item.media}
                    alt={item.title}
                    fill
                    className="object-cover rounded-md"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={item.creator.avatar} />
                      <AvatarFallback>{item.creator.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{item.creator.name}</span>
                  </div>
                  <h3 className="text-xl font-medium mb-2">{item.title}</h3>
                  <p className="text-muted-foreground mb-4">{item.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    {item.price && (
                      <Button>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        ${item.price}
                      </Button>
                    )}
                    <div className="flex items-center gap-4 ml-auto">
                      <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <Heart className="h-4 w-4" />
                        {item.likes}
                      </button>
                      <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <MessageCircle className="h-4 w-4" />
                        {item.comments}
                      </button>
                      <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {viewMode === "video" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.filter(item => item.type === "video").map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="relative aspect-[9/16]">
                <Image
                  src={item.media}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={item.creator.avatar} />
                        <AvatarFallback>{item.creator.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{item.creator.name}</span>
                    </div>
                    <p className="text-sm mb-2">{item.description}</p>
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {item.likes}
                      </button>
                      <button className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        {item.comments}
                      </button>
                      <button className="flex items-center gap-1 ml-auto">
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </InfiniteScroll>
  );
}