"use client";

import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarketplaceFeed } from "@/components/marketplace/marketplace-feed";
import { LayoutWrapper } from "@/components/layout/layout-wrapper";
import { Grid, Layout, Video } from "lucide-react";

export default function MarketplacePage() {
  const [viewMode, setViewMode] = useState<"grid" | "list" | "video">("grid");

  return (
    <LayoutWrapper>
      <div className="min-h-screen pt-16">
        {/* Header */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b">
          <div className="container max-w-6xl py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold font-cinzel">Marketplace</h1>
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as typeof viewMode)}>
                <ToggleGroupItem value="grid" aria-label="Grid view">
                  <Grid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view">
                  <Layout className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="video" aria-label="Video view">
                  <Video className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="container max-w-6xl py-6">
            <MarketplaceFeed viewMode={viewMode} />
          </div>
        </ScrollArea>
      </div>
    </LayoutWrapper>
  );
}