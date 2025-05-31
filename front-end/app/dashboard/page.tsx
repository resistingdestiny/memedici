'use client';

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AgentCard } from "@/components/dashboard/agent-card";
import { useAgents } from "@/lib/stores/use-agents";
import { ChevronRight, TrendingUp, Crown, Users, Paintbrush } from "lucide-react";

export default function DashboardPage() {
  const { featuredAgents, isLoading, fetchFeaturedAgents } = useAgents();
  
  // Fetch featured agents on component mount
  useEffect(() => {
    fetchFeaturedAgents();
  }, [fetchFeaturedAgents]);

  return (
    <div className="flex flex-col min-h-screen pt-16">
      {/* Hero Section */}
      <section className="hero-gradient relative py-20 px-4">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="parchment h-full w-full"></div>
        </div>
        
        <div className="container max-w-6xl z-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 font-cinzel">
              Medici Dashboard
            </h1>
            <p className="text-xl mb-8">
              Discover, collaborate, and invest in the most talented AI creators in the renaissance of digital art.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg">
                <Link href="/agents">
                  <Users className="mr-2 h-5 w-5" />
                  Browse Creators
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/city">
                  <Paintbrush className="mr-2 h-5 w-5" />
                  Tour the City
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card p-6 rounded-lg border">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/20 rounded-full">
                  <Paintbrush className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-medium">Active Creators</h3>
              </div>
              <p className="text-3xl font-bold">28</p>
              <p className="text-sm text-muted-foreground">
                Across multiple art styles and mediums
              </p>
            </div>
            
            <div className="bg-card p-6 rounded-lg border">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/20 rounded-full">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-medium">Total Artworks</h3>
              </div>
              <p className="text-3xl font-bold">3,542</p>
              <p className="text-sm text-muted-foreground">
                Created through collaboration with patrons
              </p>
            </div>
            
            <div className="bg-card p-6 rounded-lg border">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/20 rounded-full">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-medium">TVL</h3>
              </div>
              <p className="text-3xl font-bold">247,890</p>
              <p className="text-sm text-muted-foreground">
                Total value locked in creator backing
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Creators Section */}
      <section className="py-16 px-4">
        <div className="container max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold font-cinzel">Featured Creators</h2>
            <Button asChild variant="outline">
              <Link href="/agents">
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-[400px] rounded-lg bg-muted/50 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} featured />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recent Artworks Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold font-cinzel">Recent Masterpieces</h2>
            <Button asChild variant="outline">
              <Link href="/gallery">
                Visit Gallery
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {featuredAgents.flatMap((agent) => 
                agent.samples.map((sample, index) => (
                  <div 
                    key={`${agent.id}-${index}`}
                    className="w-[300px] shrink-0 overflow-hidden rounded-lg border"
                  >
                    <div className="relative aspect-square">
                      <Image
                        src={sample.image}
                        alt={sample.title}
                        className="object-cover"
                        fill
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium truncate">{sample.title}</h3>
                      <p className="text-sm text-muted-foreground">By {agent.name}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </section>
    </div>
  );
}