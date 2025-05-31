"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type AgentConfig } from "@/lib/types";

interface AgentCardConfigProps {
  agent: AgentConfig;
  featured?: boolean;
}

export function AgentCardConfig({ agent, featured = false }: AgentCardConfigProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-300 h-full flex flex-col",
        featured || agent.featured ? "border-primary/50" : "",
        isHovered ? "shadow-lg shadow-primary/20 scale-[1.02]" : ""
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={agent.avatar || "https://api.dicebear.com/7.x/avatars/svg?seed=" + agent.id}
          alt={agent.display_name}
          className={cn(
            "object-cover transition-transform duration-500",
            isHovered ? "scale-110" : "scale-100"
          )}
          fill
        />
        {(featured || agent.featured) && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-primary text-primary-foreground">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="flex-grow p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold font-cinzel">{agent.display_name}</h3>
        </div>
        
        <div className="mb-3">
          <Badge variant="secondary" className="text-xs">
            {agent.collective || agent.archetype}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {agent.origin_story}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {agent.core_traits.slice(0, 3).map((trait) => (
            <Badge key={trait} variant="outline" className="text-xs">
              {trait}
            </Badge>
          ))}
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Artworks</span>
            <span className="font-semibold">{agent.stats?.artworksCreated || 0}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Backers</span>
            <div className="flex items-center">
              <Users className="h-3 w-3 mr-1 text-primary" />
              <span className="font-semibold">{agent.stats?.backersCount || 0}</span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full">
          <Link href={`/agents/${agent.id}`}>
            View Profile
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
} 