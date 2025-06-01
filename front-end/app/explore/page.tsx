"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageCard } from "@/components/feed/image-card";
import { LayoutWrapper } from "@/components/layout/layout-wrapper";
import { useFeed } from "@/lib/stores/use-feed";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const categories = [
  "All",
  "Digital Art",
  "Portraits",
  "Landscapes",
  "Abstract",
  "AI Generated",
  "Photography",
  "3D Art",
  "Animation",
  "Videos",
  "Products"
];

export default function ExplorePage() {
  const { items, loadMore, hasMore } = useFeed();
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Load initial feed data
  useEffect(() => {
    if (items.length === 0) {
      loadMore();
    }
  }, [items.length, loadMore]);

  return (
    <LayoutWrapper>
      <div className="min-h-screen pt-16">
        {/* Header */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b">
          <div className="container max-w-[2000px] py-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-cinzel">Explore</h1>
              </div>
              
              <div className="flex items-center gap-4 overflow-x-auto pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
                <div className="flex gap-2">
                  {categories.map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      className="cursor-pointer shrink-0"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="container max-w-[2000px] py-6">
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4">
              {items.map((item) => (
                <div key={item.id} className="mb-4 break-inside-avoid">
                  <ImageCard item={item} />
                </div>
              ))}
            </div>
            
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => loadMore()}
                  className="min-w-[200px]"
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </LayoutWrapper>
  );
}