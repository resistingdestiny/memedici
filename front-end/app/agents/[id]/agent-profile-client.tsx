"use client";

import { useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PromptStudioConfig } from "@/components/dashboard/prompt-studio-config";
import { StakeModal } from "@/components/dashboard/stake-modal";
import { useGetAgent } from "@/hooks/useGetAgent";
import { httpClient } from "@/lib/http";
import { ArrowLeft, TrendingUp, Users, MessageSquare, ImageIcon, Sparkles, AlertCircle, Trash2, Zap } from "lucide-react";

export function AgentProfileClient() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data: agent, isLoading, isError, error, refetch } = useGetAgent(params.id);
  const [currentTab, setCurrentTab] = useState("overview");
  const [isEvolving, setIsEvolving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  const handleEvolve = async () => {
    if (!agent) return;
    
    setIsEvolving(true);
    try {
      await httpClient.post(`/agents/${agent.id}/evolve`);
      // Refetch agent data to get updated information
      refetch();
    } catch (err) {
      console.error("Error evolving agent:", err);
    } finally {
      setIsEvolving(false);
    }
  };

  const handleClearMemory = async () => {
    if (!agent) return;
    
    setIsClearing(true);
    try {
      await httpClient.delete(`/agents/${agent.id}/memory`);
      // Refetch agent data to get updated information
      refetch();
    } catch (err) {
      console.error("Error clearing agent memory:", err);
    } finally {
      setIsClearing(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (isError || !agent) {
    return (
      <div className="min-h-screen pt-16 px-4 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Agent Not Found</h1>
        <p className="text-muted-foreground mb-8">
          {error?.message || "The agent you're looking for doesn't exist or has been removed."}
        </p>
        <div className="flex gap-4">
          <Button onClick={() => router.push("/agents")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Agents
          </Button>
          <Button variant="outline" onClick={refetch}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-16">
      {/* Header */}
      <div className="bg-muted/30 py-8 px-4">
        <div className="container max-w-6xl">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-primary/20">
                <Image
                  src={agent.avatar || "https://api.dicebear.com/7.x/avatars/svg?seed=" + agent.id}
                  alt={agent.display_name}
                  className="object-cover"
                  fill
                />
              </div>
            </div>
            
            <div className="md:col-span-2">
              <div className="flex flex-col h-full">
                <div className="flex-grow">
                  <h1 className="text-3xl md:text-4xl font-bold font-cinzel mb-3">
                    {agent.display_name}
                  </h1>
                  
                  <div className="mb-4">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      {agent.collective || agent.archetype}
                    </Badge>
                    {agent.featured && (
                      <Badge className="ml-2 text-sm px-3 py-1">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {agent.core_traits.map((trait) => (
                      <Badge key={trait} variant="outline">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                  
                  <p className="text-lg mb-6">
                    {agent.origin_story}
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Prompts</span>
                      <span className="text-xl font-semibold">
                        {agent.stats?.promptsHandled || 0}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Artworks</span>
                      <span className="text-xl font-semibold">
                        {agent.stats?.artworksCreated || 0}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Backers</span>
                      <div className="flex items-center">
                        <span className="text-xl font-semibold">
                          {agent.stats?.backersCount || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Total Staked</span>
                      <span className="text-xl font-semibold">
                        {agent.stats?.totalStaked || 0}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  {agent.gallery && (
                    <Button 
                      onClick={() => router.push(`/gallery/${agent.gallery}`)}
                      className="flex items-center gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Visit Gallery
                    </Button>
                  )}
                  <Button
                    onClick={handleEvolve}
                    disabled={isEvolving}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {isEvolving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        Evolving...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Evolve Agent
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleClearMemory}
                    disabled={isClearing}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {isClearing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Clear Memory
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="py-8 px-4">
        <div className="container max-w-6xl">
          <Tabs 
            defaultValue="overview" 
            value={currentTab}
            onValueChange={setCurrentTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 w-full max-w-md mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="create">Create</TabsTrigger>
              <TabsTrigger value="invest">Invest</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold font-cinzel mb-6 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-primary" />
                  Featured Works
                </h2>
                {agent.samples && agent.samples.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {agent.samples.map((sample, index) => (
                      <Card key={index} className="overflow-hidden">
                        <div className="relative aspect-[4/3] w-full">
                          <Image
                            src={sample.image}
                            alt={sample.title}
                            className="object-cover"
                            fill
                          />
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-medium">{sample.title}</h3>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No featured works available yet.</p>
                  </div>
                )}
              </div>
              
              <div>
                <h2 className="text-2xl font-bold font-cinzel mb-6 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-primary" />
                  Top Backers
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted"></div>
                          <div>
                            <p className="font-medium">Patron #{i+1}</p>
                            <p className="text-sm text-muted-foreground">
                              {Math.floor(Math.random() * 1000)} tokens
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="create" className="space-y-8">
              <PromptStudioConfig agentId={agent.id} agent={agent} />
            </TabsContent>
            
            <TabsContent value="invest" className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-4">Investment Overview</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Current Valuation</span>
                        <span className="font-semibold">{agent.stats?.totalStaked || 0} tokens</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Backers</span>
                        <span className="font-semibold">{agent.stats?.backersCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Revenue Generated</span>
                        <span className="font-semibold">{(agent.stats?.artworksCreated || 0) * 10} tokens</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-4">Performance Metrics</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Artworks Created</span>
                        <span className="font-semibold">{agent.stats?.artworksCreated || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Prompts Handled</span>
                        <span className="font-semibold">{agent.stats?.promptsHandled || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Success Rate</span>
                        <span className="font-semibold">
                          {agent.stats?.promptsHandled ? 
                            Math.round(((agent.stats?.artworksCreated || 0) / agent.stats.promptsHandled) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}