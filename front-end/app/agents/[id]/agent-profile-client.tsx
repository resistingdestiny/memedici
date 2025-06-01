"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PromptStudio } from "@/components/dashboard/prompt-studio";
import { StakeModal } from "@/components/dashboard/stake-modal";
import { useGetAgent } from "@/hooks/useGetAgent";
import { useAgentArtworks } from "@/hooks/useAgentArtworks";
import { api } from "@/lib/api";
import { type AgentConfig } from "@/lib/types";
import { type Agent } from "@/lib/stubs";
import { ArrowLeft, TrendingUp, Users, MessageSquare, ImageIcon, Sparkles, AlertCircle, Trash2, Zap, ArrowDown, Loader2 } from "lucide-react";
import { httpClient } from "@/lib/http";
import { toast } from "sonner";

// Helper function to convert AgentConfig to Agent for legacy components
function convertAgentConfigToAgent(config: AgentConfig): Agent {
  return {
    id: config.id,
    name: config.display_name,
    description: config.origin_story,
    specialty: config.core_traits,
    collective: config.collective || "Independent",
    avatar: config.avatar || `https://api.dicebear.com/7.x/avatars/svg?seed=${config.id}`,
    featured: config.featured || false,
    gallery: config.gallery || null,
    stats: config.stats || {
      promptsHandled: 0,
      artworksCreated: 0,
      backersCount: 0,
      totalStaked: 0,
    },
    samples: config.samples || [],
  };
}

export function AgentProfileClient() {
  const router = useRouter();
  const { id } = useParams();
  const [currentTab, setCurrentTab] = useState("overview");
  const [isEvolving, setIsEvolving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Debug logging
  console.log("AgentProfileClient mounted with id:", id);

  const { data: agent, isLoading: isAgentLoading, isError: isAgentError, error: agentError, refetch: refetchAgent } = useGetAgent(id as string);
  const { artworks, statistics, isLoading: isArtworksLoading, isError: isArtworksError, hasMore, loadMore, refetch: refetchArtworks } = useAgentArtworks(id as string);

  // Debug logging
  console.log("Agent data:", { agent, isAgentLoading, isAgentError, agentError });

  const handleEvolve = async () => {
    if (!agent) return;
    
    setIsEvolving(true);
    try {
      const response = await httpClient.post(`/agents/${agent.id}/evolve`);
      if (response.data.success) {
        toast.success("Agent evolved successfully! 🎭");
        refetchAgent();
      } else {
        toast.error("Failed to evolve agent");
      }
    } catch (error) {
      toast.error("Error evolving agent");
    } finally {
      setIsEvolving(false);
    }
  };

  const handleClearMemory = async () => {
    if (!agent) return;
    
    setIsClearing(true);
    try {
      const response = await httpClient.delete(`/agents/${agent.id}/memory`);
      if (response.data.success) {
        toast.success("Agent memory cleared successfully! 🧠");
        refetchAgent();
      } else {
        toast.error("Failed to clear agent memory");
      }
    } catch (error) {
      toast.error("Error clearing agent memory");
    } finally {
      setIsClearing(false);
    }
  };

  if (isAgentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading agent...</p>
        </div>
      </div>
    );
  }

  if (isAgentError || !agent) {
    console.error("Agent error:", agentError);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Agent not found or failed to load.
            {agentError && (
              <div className="mt-2 text-xs">
                Error: {agentError.message}
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Convert to legacy format for components that need it
  const legacyAgent = convertAgentConfigToAgent(agent);

  return (
    <>
      <div className="relative">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-br from-primary via-purple-600 to-pink-600 text-white">
          <div className="container max-w-6xl py-8 px-4">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="mb-6 text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm border-4 border-white/30">
                  <Image
                    src={agent.avatar || `https://api.dicebear.com/7.x/avatars/svg?seed=${agent.id}`}
                    alt={agent.display_name}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold font-cinzel">
                    {agent.display_name}
                  </h1>
                </div>
                
                <div className="mb-4">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {agent.collective || agent.archetype}
                  </Badge>
                  {agent.studio_name && (
                    <Badge variant="outline" className="ml-2 text-sm px-3 py-1">
                      🏛️ {agent.studio_name}
                    </Badge>
                  )}
                  {agent.art_style && (
                    <Badge variant="outline" className="ml-2 text-sm px-3 py-1">
                      🎨 {agent.art_style}
                    </Badge>
                  )}
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
                
                <p className="text-lg mb-4">
                  {agent.origin_story}
                </p>

                {/* Studio Description */}
                {agent.studio_description && (
                  <div className="mb-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                    <h3 className="font-semibold text-white mb-2">🏛️ Studio: {agent.studio_name}</h3>
                    <p className="text-white/90">{agent.studio_description}</p>
                  </div>
                )}

                {/* Creative Specs */}
                <div className="mb-6 space-y-3">
                  {agent.primary_mediums && agent.primary_mediums.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-white/80">Primary Mediums:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {agent.primary_mediums.map((medium) => (
                          <Badge key={medium} variant="outline" className="text-xs">
                            {medium}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {agent.influences && agent.influences.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-white/80">Influences:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {agent.influences.map((influence) => (
                          <Badge key={influence} variant="outline" className="text-xs">
                            {influence}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {agent.signature_motifs && agent.signature_motifs.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-white/80">Signature Motifs:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {agent.signature_motifs.map((motif) => (
                          <Badge key={motif} variant="outline" className="text-xs">
                            {motif}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {agent.colour_palette && agent.colour_palette.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-white/80">Color Palette:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {agent.colour_palette.map((color, index) => (
                          <div
                            key={color}
                            className="w-6 h-6 rounded-full border-2 border-white/30"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Prompts</span>
                    <span className="text-xl font-semibold">
                      {agent.interaction_count || agent.stats?.promptsHandled || 0}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Artworks</span>
                    <span className="text-xl font-semibold">
                      {statistics?.total_artworks || agent.artworks_created || agent.stats?.artworksCreated || 0}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Creation Rate</span>
                    <div className="flex items-center">
                      <span className="text-xl font-semibold">
                        {agent.creation_rate || 3}/day
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Model</span>
                    <span className="text-xl font-semibold text-xs">
                      {agent.model_name || 'GPT-4'}
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
                  onClick={() => router.push(`/city?agent=${agent.id}&focus=true`)}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Sparkles className="h-4 w-4" />
                  Go to Sandbox
                </Button>
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
                <StakeModal agent={legacyAgent} />
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
                
                {/* Real Artworks from API */}
                {isArtworksLoading && artworks.length === 0 ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading artworks...</p>
                  </div>
                ) : isArtworksError ? (
                  <div className="text-center py-12">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Failed to load artworks.</p>
                    <Button variant="outline" onClick={refetchArtworks} className="mt-4">
                      Try Again
                    </Button>
                  </div>
                ) : artworks.length > 0 ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {artworks.map((artwork) => (
                        <Card key={artwork.id} className="overflow-hidden">
                          <div className="relative aspect-[4/3] w-full">
                            <Image
                              src={artwork.file_url}
                              alt={artwork.prompt}
                              className="object-cover"
                              fill
                              onError={(e) => {
                                // Fallback for broken images
                                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f0f0f0'/%3E%3Ctext x='200' y='150' text-anchor='middle' dy='.35em' font-family='Arial, sans-serif' font-size='16' fill='%23666'%3EArtwork%3C/text%3E%3C/svg%3E";
                              }}
                            />
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-medium mb-2">
                              {artwork.prompt.length > 50 
                                ? `${artwork.prompt.substring(0, 50)}...` 
                                : artwork.prompt
                              }
                            </h3>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p><strong>Model:</strong> {artwork.model_name}</p>
                              <p><strong>Created:</strong> {new Date(artwork.created_at).toLocaleDateString()}</p>
                              {artwork.file_size && (
                                <p><strong>Size:</strong> {(artwork.file_size / 1024 / 1024).toFixed(2)}MB</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {/* Load More Button */}
                    {hasMore && (
                      <div className="text-center">
                        <Button
                          variant="outline"
                          onClick={loadMore}
                          disabled={isArtworksLoading}
                          className="flex items-center gap-2"
                        >
                          {isArtworksLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <ArrowDown className="h-4 w-4" />
                              Load More
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    
                    {/* Statistics */}
                    {statistics && (
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-4">Statistics</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold">{statistics.total_artworks}</p>
                                <p className="text-sm text-muted-foreground">Total Artworks</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold">{statistics.recent_activity.last_7_days}</p>
                                <p className="text-sm text-muted-foreground">Last 7 Days</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold">{statistics.recent_activity.last_30_days}</p>
                                <p className="text-sm text-muted-foreground">Last 30 Days</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold">{Object.keys(statistics.by_model_type).length}</p>
                                <p className="text-sm text-muted-foreground">Model Types</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No artworks created yet.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Start creating with {agent.display_name} in the Create tab!
                    </p>
                  </div>
                )}
              </div>

              {/* Studio & Technical Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Studio Items */}
                {agent.studio_items && agent.studio_items.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold font-cinzel mb-6 flex items-center">
                      🏛️ Studio Equipment
                    </h2>
                    <div className="space-y-4">
                      {agent.studio_items.map((item, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-medium">{item.name}</h3>
                              {item.rarity && (
                                <Badge variant={item.rarity === 'legendary' ? 'default' : 'secondary'}>
                                  {item.rarity}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                            {item.category && (
                              <Badge variant="outline" className="text-xs">
                                {item.category}
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Specs */}
                <div>
                  <h2 className="text-2xl font-bold font-cinzel mb-6 flex items-center">
                    ⚙️ Technical Profile
                  </h2>
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between">
                        <span>Agent Type</span>
                        <span className="font-semibold">{agent.agent_type || 'Creative Artist'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>AI Model</span>
                        <span className="font-semibold">{agent.model_name || 'GPT-4'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Temperature</span>
                        <span className="font-semibold">{agent.temperature || 0.7}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Memory Enabled</span>
                        <span className="font-semibold">
                          {agent.memory_enabled !== false ? '✅ Yes' : '❌ No'}
                        </span>
                      </div>
                      {agent.tools_enabled && agent.tools_enabled.length > 0 && (
                        <div>
                          <span className="text-sm font-medium mb-2 block">Enabled Tools:</span>
                          <div className="flex flex-wrap gap-1">
                            {agent.tools_enabled.map((tool) => (
                              <Badge key={tool} variant="outline" className="text-xs">
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Collaboration & Prompt Formula */}
              {(agent.collab_affinity || agent.prompt_formula) && (
                <div>
                  <h2 className="text-2xl font-bold font-cinzel mb-6 flex items-center">
                    🤝 Creative Philosophy
                  </h2>
                  <div className="space-y-6">
                    {agent.collab_affinity && agent.collab_affinity.length > 0 && (
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="font-semibold mb-3">Collaboration Affinities</h3>
                          <div className="flex flex-wrap gap-2">
                            {agent.collab_affinity.map((affinity) => (
                              <Badge key={affinity} variant="secondary">
                                {affinity}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {agent.prompt_formula && (
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="font-semibold mb-3">Creative Formula</h3>
                          <p className="text-muted-foreground italic">
                            "{agent.prompt_formula}"
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
              
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
              <PromptStudio agent={legacyAgent} />
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
                        <span>Return Rate</span>
                        <span className="font-semibold text-green-600">+12.5%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}