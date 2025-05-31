"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PromptStudio } from "@/components/dashboard/prompt-studio";
import { StakeModal } from "@/components/dashboard/stake-modal";
import { useAgents } from "@/lib/stores/use-agents";
import { ArrowLeft, TrendingUp, Users, MessageSquare, ImageIcon, Sparkles } from "lucide-react";

export function AgentProfileClient() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { getAgentById, selectedAgent, isLoading } = useAgents();
  const [currentTab, setCurrentTab] = useState("overview");
  
  useEffect(() => {
    if (params.id) {
      getAgentById(params.id);
    }
  }, [params.id, getAgentById]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!selectedAgent) {
    return (
      <div className="min-h-screen pt-16 px-4 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Agent Not Found</h1>
        <p className="text-muted-foreground mb-8">The agent you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <Button onClick={() => router.push("/agents")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Agents
        </Button>
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
                  src={selectedAgent.avatar}
                  alt={selectedAgent.name}
                  className="object-cover"
                  fill
                />
              </div>
            </div>
            
            <div className="md:col-span-2">
              <div className="flex flex-col h-full">
                <div className="flex-grow">
                  <h1 className="text-3xl md:text-4xl font-bold font-cinzel mb-3">
                    {selectedAgent.name}
                  </h1>
                  
                  <div className="mb-4">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      {selectedAgent.collective}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedAgent.specialty.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <p className="text-lg mb-6">
                    {selectedAgent.description}
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Prompts</span>
                      <span className="text-xl font-semibold">
                        {selectedAgent.stats.promptsHandled}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Artworks</span>
                      <span className="text-xl font-semibold">
                        {selectedAgent.stats.artworksCreated}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Backers</span>
                      <div className="flex items-center">
                        <span className="text-xl font-semibold">
                          {selectedAgent.stats.backersCount}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Total Staked</span>
                      <span className="text-xl font-semibold">
                        {selectedAgent.stats.totalStaked}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  {selectedAgent.gallery && (
                    <Button 
                      onClick={() => router.push(`/gallery/${selectedAgent.gallery}`)}
                      className="flex items-center gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Visit Gallery
                    </Button>
                  )}
                  <StakeModal agent={selectedAgent} />
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {selectedAgent.samples.map((sample, index) => (
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
              
              <div>
                <h2 className="text-2xl font-bold font-cinzel mb-6 flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-primary" />
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex justify-between mb-2">
                        <p className="font-medium">
                          New artwork created
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {i+1}d ago
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedAgent.name} created a new piece based on a prompt from Patron #
                        {Math.floor(Math.random() * 100)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="create" className="space-y-8">
              <PromptStudio agent={selectedAgent} />
              
              <div>
                <h2 className="text-2xl font-bold font-cinzel mb-6">
                  Prompt History
                </h2>
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex justify-between mb-2">
                        <p className="font-medium">
                          {["Renaissance portrait", "Futuristic landscape"][i]}
                        </p>
                        <Badge variant="outline">
                          {["Completed", "Processing"][i]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {["A portrait of a young woman with flowing hair in Renaissance style with soft lighting", 
                          "Create a futuristic cityscape with cyber-renaissance architecture and golden light"][i]}
                      </p>
                      {i === 0 && (
                        <div className="relative aspect-video rounded-md overflow-hidden bg-muted">
                          <Image
                            src="https://images.pexels.com/photos/7242755/pexels-photo-7242755.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
                            alt="Result"
                            className="object-cover"
                            fill
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="invest" className="space-y-8">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold font-cinzel mb-6 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                    Staking Overview
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Total Staked</p>
                      <p className="text-2xl font-bold">{selectedAgent.stats.totalStaked}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Backers</p>
                      <p className="text-2xl font-bold">{selectedAgent.stats.backersCount}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Est. APY</p>
                      <p className="text-2xl font-bold text-primary">12-18%</p>
                    </div>
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-4">Staking Benefits</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <div className="rounded-full p-1 bg-primary/20 mt-0.5">
                          <Sparkles className="h-3 w-3 text-primary" />
                        </div>
                        <span>Earn a share of revenue from the creator&apos;s artworks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full p-1 bg-primary/20 mt-0.5">
                          <Sparkles className="h-3 w-3 text-primary" />
                        </div>
                        <span>Priority access to new releases and limited editions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full p-1 bg-primary/20 mt-0.5">
                          <Sparkles className="h-3 w-3 text-primary" />
                        </div>
                        <span>Governance rights for future creator development</span>
                      </li>
                    </ul>
                  </div>
                  
                  <StakeModal agent={selectedAgent} />
                </CardContent>
              </Card>
              
              <div>
                <h2 className="text-2xl font-bold font-cinzel mb-6">
                  Performance History
                </h2>
                <div className="relative aspect-[2/1] w-full bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Performance chart visualization</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}