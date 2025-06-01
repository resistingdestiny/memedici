"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Building, 
  Users, 
  Palette, 
  Search,
  PlusCircle,
  Loader2,
  ArrowRight
} from "lucide-react";
import { 
  getStudios, 
  getAgents,
  Studio,
  Agent
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface StudioWithAgents extends Studio {
  agents?: Agent[];
  agentCount?: number;
}

export default function StudiosPage() {
  const [loading, setLoading] = useState(true);
  const [studios, setStudios] = useState<StudioWithAgents[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredStudios, setFilteredStudios] = useState<StudioWithAgents[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Filter studios based on search term
    const filtered = studios.filter(studio =>
      studio.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studio.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studio.theme?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studio.art_style?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStudios(filtered);
  }, [studios, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studiosResponse, agentsResponse] = await Promise.all([
        getStudios(),
        getAgents()
      ]);
      
      const studiosData = studiosResponse.studios || [];
      const agentsData = agentsResponse.agents || [];
      
      // Enhance studios with agent counts
      const enhancedStudios = studiosData.map((studio: Studio) => {
        const studioAgents = agentsData.filter((agent: Agent) => 
          agent.studio?.name === studio.id || agent.collective === studio.id
        );
        
        return {
          ...studio,
          agents: studioAgents,
          agentCount: studioAgents.length
        };
      });
      
      setStudios(enhancedStudios);
      setAgents(agentsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load studios and agents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getThemeColor = (theme: string) => {
    switch (theme?.toLowerCase()) {
      case 'modern': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'classical': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'abstract': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'minimalist': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'surreal': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const getStyleIcon = (artStyle: string) => {
    switch (artStyle?.toLowerCase()) {
      case 'digital': return '💻';
      case 'oil painting': return '🎨';
      case 'watercolor': return '🖌️';
      case 'sculpture': return '🗿';
      case 'photography': return '📸';
      default: return '🎭';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      <div className="container max-w-7xl py-8">
        {/* Header */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Creative Studios</h1>
              <p className="text-muted-foreground">
                Discover art studios where AI creators collaborate and create amazing works
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/studio">
                <Button variant="outline">
                  <Building className="h-4 w-4 mr-2" />
                  Manage Studios
                </Button>
              </Link>
              <Link href="/studio">
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Studio
                </Button>
              </Link>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search studios by name, theme, or style..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building className="h-4 w-4" />
              {filteredStudios.length} {filteredStudios.length === 1 ? 'studio' : 'studios'}
            </div>
          </div>
        </div>

        {/* Studios Grid */}
        {filteredStudios.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudios.map((studio) => (
              <Card key={studio.id} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">
                        {studio.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {studio.description}
                      </p>
                    </div>
                    <div className="text-2xl ml-3">
                      {getStyleIcon(studio.art_style || 'digital')}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Studio Info */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-lg font-semibold">{studio.agentCount || 0}</div>
                        <div className="text-xs text-muted-foreground">Agents</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-lg font-semibold">{studio.studio_items?.length || 0}</div>
                        <div className="text-xs text-muted-foreground">Items</div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {studio.theme && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getThemeColor(studio.theme)}`}
                        >
                          {studio.theme}
                        </Badge>
                      )}
                      {studio.art_style && (
                        <Badge variant="outline" className="text-xs">
                          {studio.art_style}
                        </Badge>
                      )}
                    </div>

                    {/* Agents Preview */}
                    {studio.agents && studio.agents.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Featured Agents</div>
                        <div className="flex -space-x-2">
                          {studio.agents.slice(0, 4).map((agent, index) => (
                            <div
                              key={agent.id}
                              className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-background"
                              title={agent.name}
                            >
                              <Image
                                src={agent.avatar}
                                alt={agent.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ))}
                          {studio.agents.length > 4 && (
                            <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                              +{studio.agents.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Link href={`/studio?selected=${studio.id}`} className="flex-1">
                        <Button size="sm" className="w-full">
                          <Users className="h-4 w-4 mr-2" />
                          View Studio
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            {searchTerm ? (
              <div>
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No studios found</h3>
                <p className="text-muted-foreground mb-4">
                  No studios match your search "{searchTerm}". Try different keywords.
                </p>
                <Button variant="outline" onClick={() => setSearchTerm("")}>
                  Clear Search
                </Button>
              </div>
            ) : (
              <div>
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Studios Created Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Be the first to create a creative studio and start collaborating with AI agents.
                </p>
                <Link href="/studio">
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Your First Studio
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        {studios.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <Building className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{studios.length}</div>
                <div className="text-sm text-muted-foreground">Total Studios</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {studios.reduce((sum, studio) => sum + (studio.agentCount || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Active Agents</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Palette className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {new Set(studios.map(s => s.theme).filter(Boolean)).size}
                </div>
                <div className="text-sm text-muted-foreground">Unique Themes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <PlusCircle className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {studios.reduce((sum, studio) => sum + (studio.studio_items?.length || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Studio Items</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 