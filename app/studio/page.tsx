"use client";

import { useState } from "react";
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
  Loader2
} from "lucide-react";

export default function StudioPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  
  const mockAgents = [
    {
      id: "1",
      name: "Renaissance Master",
      description: "Specializes in classical art styles with a modern twist",
      specialty: ["portraits", "classical", "oil painting"],
      avatar: "https://images.pexels.com/photos/6664290/pexels-photo-6664290.jpeg",
      status: "active"
    },
    {
      id: "2",
      name: "Digital Surrealist",
      description: "Creates dreamlike digital compositions",
      specialty: ["surrealism", "digital", "conceptual"],
      avatar: "https://images.pexels.com/photos/7242755/pexels-photo-7242755.jpeg",
      status: "training"
    }
  ];

  return (
    <div className="min-h-screen pt-16">
      <div className="container max-w-7xl py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Agent List */}
          <div className="w-full lg:w-1/4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Your Agents
                  </span>
                  <Button size="sm" variant="ghost">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedAgent === agent.id
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedAgent(agent.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden">
                          <Image
                            src={agent.avatar}
                            alt={agent.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-grow">
                          <h3 className="font-medium">{agent.name}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {agent.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Studios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg hover:bg-muted cursor-pointer">
                    <h3 className="font-medium">Renaissance Studio</h3>
                    <p className="text-sm text-muted-foreground">3 agents</p>
                  </div>
                  <div className="p-3 rounded-lg hover:bg-muted cursor-pointer">
                    <h3 className="font-medium">Modern Art Collective</h3>
                    <p className="text-sm text-muted-foreground">5 agents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Tabs defaultValue="create">
              <TabsList className="mb-6">
                <TabsTrigger value="create">
                  <Brush className="h-4 w-4 mr-2" />
                  Create
                </TabsTrigger>
                <TabsTrigger value="train">
                  <Wand2 className="h-4 w-4 mr-2" />
                  Train
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Create with AI</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Select Agents
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {mockAgents.map((agent) => (
                            <Badge
                              key={agent.id}
                              variant="outline"
                              className="cursor-pointer"
                            >
                              {agent.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Prompt
                          </label>
                          <Textarea
                            placeholder="Describe what you want to create..."
                            className="min-h-[120px]"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Style Settings
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input placeholder="Art Style" />
                            <Input placeholder="Medium" />
                          </div>
                        </div>
                        
                        <Button className="w-full" disabled={isCreating}>
                          {isCreating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Create Artwork
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Creations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="relative aspect-square rounded-lg overflow-hidden border"
                          >
                            <div className="absolute inset-0 bg-muted animate-pulse" />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="train">
                <Card>
                  <CardHeader>
                    <CardTitle>Train Your Agents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        Improve your agents&apos; capabilities by providing training data and feedback.
                      </p>
                      
                      <div className="grid gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <h3 className="font-medium mb-2">Upload Training Data</h3>
                            <Button variant="outline" className="w-full">
                              Select Files
                            </Button>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4">
                            <h3 className="font-medium mb-2">Fine-tune Parameters</h3>
                            <div className="space-y-2">
                              <Input placeholder="Learning Rate" />
                              <Input placeholder="Epochs" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Agent Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Agent Name
                        </label>
                        <Input placeholder="Enter agent name" />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Description
                        </label>
                        <Textarea placeholder="Describe your agent&apos;s capabilities" />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Specialties
                        </label>
                        <Input placeholder="Add specialties (comma separated)" />
                      </div>
                      
                      <Button>Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}