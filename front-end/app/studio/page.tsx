"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  Users, 
  Palette, 
  Settings, 
  PlusCircle,
  Brush,
  Wand2,
  Loader2,
  Building,
  Edit,
  Save,
  X
} from "lucide-react";
import { 
  getStudios, 
  createStudio, 
  getStudio, 
  getAgents, 
  assignAgentToStudio,
  getAgentArtworks,
  getAllArtworks,
  Studio,
  StudioData,
  CreateStudioRequest,
  Agent,
  StudioItem,
  ApiArtwork
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface StudioWithAgents extends Studio {
  agents?: Agent[];
}

function StudioPageContent() {
  const [loading, setLoading] = useState(true);
  const [studios, setStudios] = useState<StudioWithAgents[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedStudio, setSelectedStudio] = useState<StudioWithAgents | null>(null);
  const [studioArtworks, setStudioArtworks] = useState<ApiArtwork[]>([]);
  const [loadingArtworks, setLoadingArtworks] = useState(false);
  const [isCreatingStudio, setIsCreatingStudio] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();

  // Create studio form state
  const [studioForm, setStudioForm] = useState({
    name: "",
    description: "",
    theme: "modern",
    art_style: "digital",
    studio_items: [] as StudioItem[]
  });

  // Studio item form state
  const [itemForm, setItemForm] = useState({
    name: "",
    category: "",
    description: "",
    rarity: "common",
    condition: "excellent"
  });

  const [showItemForm, setShowItemForm] = useState(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const selectedStudioId = searchParams.get('selected');
      console.log('🏗️ Loading studio data...', { selectedStudioId });
      
      if (selectedStudioId) {
        console.log('🎯 Loading specific studio:', selectedStudioId);
        // If a specific studio is selected, fetch detailed studio info and all agents
        const [studioResponse, agentsResponse] = await Promise.all([
          getStudio(selectedStudioId),
          getAgents()
        ]);
        
        console.log('📥 Studio API response:', studioResponse);
        console.log('👥 Agents API response:', agentsResponse);
        
        if (studioResponse.success && studioResponse.studio) {
          console.log('✅ Setting selected studio:', studioResponse.studio);
          setSelectedStudio(studioResponse.studio);
          setStudios([studioResponse.studio]); // Set as single studio for consistency
          
          // Load artworks for this studio
          loadStudioArtworks(studioResponse.studio, agentsResponse.agents || []);
        } else {
          console.error('❌ Studio not found or API error:', studioResponse);
          toast({
            title: "Error",
            description: `Studio "${selectedStudioId}" not found`,
            variant: "destructive"
          });
        }
        setAgents(agentsResponse.agents || []);
      } else {
        console.log('📋 Loading all studios');
        // If no specific studio selected, load all studios and agents
        const [studiosResponse, agentsResponse] = await Promise.all([
          getStudios(),
          getAgents()
        ]);
        
        console.log('📥 All studios response:', studiosResponse);
        console.log('👥 All agents response:', agentsResponse);
        
        setStudios(studiosResponse.studios || []);
        setAgents(agentsResponse.agents || []);
      }
    } catch (error) {
      console.error('💥 Error loading studio data:', error);
      toast({
        title: "Error",
        description: "Failed to load studio data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStudioArtworks = async (studio: Studio, allAgents: Agent[]) => {
    try {
      setLoadingArtworks(true);
      
      // Get agents that belong to this studio using studio_id
      const studioAgents = allAgents.filter(agent => 
        studio.assigned_agents.includes(agent.agent_id || agent.id)
      );
      
      // Fetch artworks for each agent in the studio
      const artworkPromises = studioAgents.map(agent => 
        getAgentArtworks(agent.agent_id || agent.id, 10, 0, true)
      );
      
      const artworkResponses = await Promise.all(artworkPromises);
      
      // Combine all artworks from studio agents
      const allStudioArtworks = artworkResponses
        .filter(response => response.success)
        .flatMap(response => response.artworks || []);
      
      setStudioArtworks(allStudioArtworks);
    } catch (error) {
      console.error('Error loading studio artworks:', error);
    } finally {
      setLoadingArtworks(false);
    }
  };

  const handleCreateStudio = async () => {
    if (!studioForm.name.trim()) {
      toast({
        title: "Error",
        description: "Studio name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreatingStudio(true);
      const studioId = studioForm.name.toLowerCase().replace(/\s+/g, '_');
      
      await createStudio({
        studio_id: studioId,
        studio: {
          name: studioForm.name,
          description: studioForm.description || "A creative space for artistic expression",
          theme: studioForm.theme,
          art_style: studioForm.art_style,
          items_count: studioForm.studio_items.length,
          featured_items: studioForm.studio_items
        }
      });

      toast({
        title: "Success",
        description: "Studio created successfully"
      });

      setShowCreateForm(false);
      setStudioForm({
        name: "",
        description: "",
        theme: "modern",
        art_style: "digital",
        studio_items: []
      });
      
      loadData();
    } catch (error) {
      console.error('Error creating studio:', error);
      toast({
        title: "Error",
        description: "Failed to create studio",
        variant: "destructive"
      });
    } finally {
      setIsCreatingStudio(false);
    }
  };

  const addStudioItem = () => {
    if (!itemForm.name.trim() || !itemForm.category.trim() || !itemForm.description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required item fields",
        variant: "destructive"
      });
      return;
    }

    const newItem: StudioItem = {
      name: itemForm.name,
      category: itemForm.category,
      description: itemForm.description,
      rarity: itemForm.rarity,
      condition: itemForm.condition,
      specifications: {}
    };

    setStudioForm(prev => ({
      ...prev,
      studio_items: [...prev.studio_items, newItem]
    }));

    setItemForm({
      name: "",
      category: "",
      description: "",
      rarity: "common",
      condition: "excellent"
    });
    setShowItemForm(false);

    toast({
      title: "Success",
      description: "Studio item added"
    });
  };

  const removeStudioItem = (index: number) => {
    setStudioForm(prev => ({
      ...prev,
      studio_items: prev.studio_items.filter((_, i) => i !== index)
    }));
  };

  const handleAssignAgent = async (agentId: string, studioId: string) => {
    try {
      await assignAgentToStudio(agentId, studioId);
      toast({
        title: "Success",
        description: "Agent assigned to studio successfully"
      });
      loadData();
    } catch (error) {
      console.error('Error assigning agent:', error);
      toast({
        title: "Error",
        description: "Failed to assign agent to studio",
        variant: "destructive"
      });
    }
  };

  const getStudioAgents = (studioId: string) => {
    const studio = studios.find(s => s.studio_id === studioId);
    if (!studio) return [];
    
    return agents.filter(agent => 
      studio.assigned_agents.includes(agent.agent_id || agent.id)
    );
  };

  const getUnassignedAgents = () => {
    // Get all agent IDs that are assigned to any studio
    const assignedAgentIds = studios.flatMap(studio => studio.assigned_agents);
    
    console.log('🔍 Debug unassigned agents:', {
      totalAgents: agents.length,
      totalStudios: studios.length,
      assignedAgentIds,
      agentIds: agents.map(a => ({ id: a.id, agent_id: a.agent_id, name: a.name }))
    });
    
    // Filter out agents that are already assigned
    const unassigned = agents.filter(agent => {
      const agentId = agent.agent_id || agent.id;
      const isAssigned = assignedAgentIds.includes(agentId);
      
      console.log(`Agent ${agent.name} (${agentId}): ${isAssigned ? 'ASSIGNED' : 'UNASSIGNED'}`);
      
      return !isAssigned;
    });
    
    console.log('📋 Unassigned agents result:', unassigned.map(a => a.name));
    
    return unassigned;
  };

  if (loading) {
    console.log('⏳ Component is loading...');
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  console.log('🎬 Rendering studio page with state:', {
    studiosCount: studios.length,
    selectedStudio: selectedStudio ? selectedStudio.studio_id : null,
    showCreateForm,
    agentsCount: agents.length
  });

  return (
    <div className="min-h-screen pt-16">
      <div className="container max-w-7xl py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Studios List */}
          <div className="w-full lg:w-1/4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    Studios
                  </span>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setShowCreateForm(true)}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {studios.map((studio) => {
                    const studioAgents = getStudioAgents(studio.studio_id);
                    return (
                      <div
                        key={studio.studio_id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedStudio?.studio_id === studio.studio_id
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedStudio(studio)}
                      >
                        <h3 className="font-medium">{studio.studio.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {studioAgents.length} agents • {studio.studio.theme}
                        </p>
                      </div>
                    );
                  })}
                  {studios.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No studios created yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Available Agents
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {getUnassignedAgents().length} unassigned agents
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getUnassignedAgents().slice(0, 5).map((agent) => (
                    <div
                      key={agent.id}
                      className="p-3 rounded-lg hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden">
                          <Image
                            src={agent.avatar}
                            alt={agent.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-grow">
                          <h4 className="font-medium text-sm">{agent.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {agent.collective}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {getUnassignedAgents().length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      All agents are assigned
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {showCreateForm ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Create New Studio
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowCreateForm(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Studio Name *
                      </label>
                      <Input
                        value={studioForm.name}
                        onChange={(e) => setStudioForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter studio name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Theme
                      </label>
                      <Input
                        value={studioForm.theme}
                        onChange={(e) => setStudioForm(prev => ({ ...prev, theme: e.target.value }))}
                        placeholder="e.g., modern, classical, abstract"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Art Style
                    </label>
                    <Input
                      value={studioForm.art_style}
                      onChange={(e) => setStudioForm(prev => ({ ...prev, art_style: e.target.value }))}
                      placeholder="e.g., digital, oil painting, watercolor"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Description
                    </label>
                    <Textarea
                      value={studioForm.description}
                      onChange={(e) => setStudioForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your studio's purpose and style..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">
                        Studio Items
                      </label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowItemForm(true)}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                    
                    {studioForm.studio_items.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {studioForm.studio_items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div>
                              <span className="font-medium">{item.name}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                ({item.category})
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeStudioItem(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {showItemForm && (
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              placeholder="Item name"
                              value={itemForm.name}
                              onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                            <Input
                              placeholder="Category"
                              value={itemForm.category}
                              onChange={(e) => setItemForm(prev => ({ ...prev, category: e.target.value }))}
                            />
                          </div>
                          <Textarea
                            placeholder="Item description"
                            value={itemForm.description}
                            onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={addStudioItem}>
                              Add Item
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setShowItemForm(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCreateStudio} 
                      disabled={isCreatingStudio}
                      className="flex-1"
                    >
                      {isCreatingStudio ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Create Studio
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : selectedStudio ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-primary" />
                        {selectedStudio.studio.name}
                      </CardTitle>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Studio
                      </Button>
                    </div>
                    <p className="text-muted-foreground">
                      {selectedStudio.studio.description}
                    </p>
                  </CardHeader>
                </Card>

                <Tabs defaultValue="overview" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="agents">Agents ({getStudioAgents(selectedStudio.studio_id).length})</TabsTrigger>
                    <TabsTrigger value="artworks">Artworks ({studioArtworks.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Studio Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {selectedStudio.studio.theme}
                            </div>
                            <div className="text-sm text-muted-foreground">Theme</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {selectedStudio.studio.art_style}
                            </div>
                            <div className="text-sm text-muted-foreground">Art Style</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {getStudioAgents(selectedStudio.studio_id).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Agents</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {selectedStudio.studio.items_count}
                            </div>
                            <div className="text-sm text-muted-foreground">Items</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {selectedStudio.studio.featured_items && selectedStudio.studio.featured_items.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Studio Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedStudio.studio.featured_items.map((item, index) => (
                              <div key={index} className="p-4 bg-muted rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium">{item.name}</h4>
                                  <Badge variant="outline">{item.condition || 'excellent'}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {item.category} • {item.rarity}
                                </p>
                                <p className="text-sm">{item.description}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="agents" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Studio Agents</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {getStudioAgents(selectedStudio.studio_id).map((agent) => (
                              <div key={agent.id} className="p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="relative w-12 h-12 rounded-full overflow-hidden">
                                    <Image
                                      src={agent.avatar}
                                      alt={agent.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                  <div className="flex-grow">
                                    <h3 className="font-medium">{agent.name}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      {agent.description}
                                    </p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {agent.specialty.slice(0, 3).map((spec, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {spec}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {getStudioAgents(selectedStudio.studio_id).length === 0 && (
                            <div className="text-center py-8">
                              <p className="text-muted-foreground mb-4">
                                No agents assigned to this studio yet
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {getUnassignedAgents().slice(0, 4).map((agent) => (
                                  <div key={agent.id} className="p-3 border rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="relative w-8 h-8 rounded-full overflow-hidden">
                                        <Image
                                          src={agent.avatar}
                                          alt={agent.name}
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm">{agent.name}</p>
                                        <p className="text-xs text-muted-foreground">{agent.collective}</p>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAssignAgent(agent.id, selectedStudio.studio_id)}
                                    >
                                      Assign
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="artworks" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>Studio Portfolio</CardTitle>
                          {loadingArtworks && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {studioArtworks.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {studioArtworks.map((artwork) => (
                              <div key={artwork.id} className="group relative overflow-hidden rounded-lg border">
                                <div className="aspect-square relative">
                                  <Image
                                    src={artwork.file_url}
                                    alt={artwork.prompt}
                                    fill
                                    className="object-cover transition-transform group-hover:scale-105"
                                  />
                                </div>
                                <div className="p-3">
                                  <h4 className="font-medium text-sm line-clamp-1">
                                    {artwork.prompt}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {artwork.model_name} • {new Date(artwork.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                              No artworks created in this studio yet
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Welcome to Studios</h3>
                  <p className="text-muted-foreground text-center mb-6">
                    Create and manage creative studios for your AI agents. Studios help organize
                    agents with shared themes, styles, and resources.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowCreateForm(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create Your First Studio
                    </Button>
                    {studios.length > 0 && (
                      <Button variant="outline" onClick={() => setSelectedStudio(studios[0])}>
                        View Existing Studios
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudioPageContent />
    </Suspense>
  );
}