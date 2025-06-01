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
  Studio,
  Agent,
  StudioItem
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
      const [studiosResponse, agentsResponse] = await Promise.all([
        getStudios(),
        getAgents()
      ]);
      
      setStudios(studiosResponse.studios || []);
      setAgents(agentsResponse.agents || []);
      
      // Check if a specific studio is selected via URL parameter
      const selectedStudioId = searchParams.get('selected');
      if (selectedStudioId && studiosResponse.studios) {
        const studio = studiosResponse.studios.find((s: Studio) => s.id === selectedStudioId);
        if (studio) {
          setSelectedStudio(studio);
        }
      }
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
          id: studioId,
          name: studioForm.name,
          description: studioForm.description || "A creative space for artistic expression",
          theme: studioForm.theme,
          art_style: studioForm.art_style,
          studio_items: studioForm.studio_items
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
    return agents.filter(agent => agent.studio?.name === studioId || agent.collective === studioId);
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
                    const studioAgents = getStudioAgents(studio.id);
                    return (
                      <div
                        key={studio.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedStudio?.id === studio.id
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedStudio(studio)}
                      >
                        <h3 className="font-medium">{studio.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {studioAgents.length} agents • {studio.theme}
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
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {agents.slice(0, 5).map((agent) => (
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
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-primary" />
                      {selectedStudio.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        {selectedStudio.description}
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-sm font-medium">Theme</label>
                          <p className="text-sm text-muted-foreground">
                            {selectedStudio.theme}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Art Style</label>
                          <p className="text-sm text-muted-foreground">
                            {selectedStudio.art_style}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Agents</label>
                          <p className="text-sm text-muted-foreground">
                            {getStudioAgents(selectedStudio.id).length}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Items</label>
                          <p className="text-sm text-muted-foreground">
                            {selectedStudio.studio_items?.length || 0}
                          </p>
                        </div>
                      </div>

                      {selectedStudio.studio_items && selectedStudio.studio_items.length > 0 && (
                        <div>
                          <h3 className="font-medium mb-2">Studio Items</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {selectedStudio.studio_items.map((item, index) => (
                              <div key={index} className="p-3 bg-muted rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium">{item.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {item.category} • {item.rarity}
                                    </p>
                                  </div>
                                  <Badge variant="outline">{item.condition}</Badge>
                                </div>
                                <p className="text-sm mt-2">{item.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Studio Agents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getStudioAgents(selectedStudio.id).map((agent) => (
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
                      
                      {getStudioAgents(selectedStudio.id).length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-4">
                            No agents assigned to this studio yet
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {agents.filter(agent => !agent.studio?.name).slice(0, 4).map((agent) => (
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
                                  onClick={() => handleAssignAgent(agent.id, selectedStudio.id)}
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