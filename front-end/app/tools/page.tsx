"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, AlertCircle, Wrench, Upload, Code, Zap } from "lucide-react";
import { CreateToolModal } from "@/components/tools/create-tool-modal";
import { ToolCard } from "@/components/tools/tool-card";
import { useTools } from "@/hooks/useTools";

export default function ToolsPage() {
  const { data: tools, isLoading, isError, error, refetch } = useTools();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "category" | "date">("name");

  // Filter tools based on search and category
  const filteredTools = tools.filter((tool) => {
    const matchesSearch = 
      searchTerm === "" ||
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === "all" || 
      tool.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Sort tools
  const sortedTools = [...filteredTools].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "category":
        return a.category.localeCompare(b.category);
      case "date":
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      default:
        return 0;
    }
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(tools.map(tool => tool.category))).filter(Boolean) as string[];

  return (
    <div className="min-h-screen pt-16">
      {/* Header */}
      <div className="bg-muted/30 py-12 px-4">
        <div className="container max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 font-cinzel">
                🛠️ Tools Management
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Create, manage, and deploy custom tools for your AI agents. Upload API specifications or build tools manually.
              </p>
            </div>
            
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Tool
            </Button>
          </div>

          {/* Error Alert */}
          {isError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load tools from server. 
                <Button variant="link" className="p-0 h-auto ml-2" onClick={refetch}>
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="art_creation">Art Creation</SelectItem>
                <SelectItem value="analysis">Analysis</SelectItem>
                <SelectItem value="enhancement">Enhancement</SelectItem>
                <SelectItem value="blockchain">Blockchain</SelectItem>
                <SelectItem value="utility">Utility</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {(category as string).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="date">Date Created</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-6xl py-8 px-4">
        {/* Stats */}
        <div className="flex items-center gap-6 mb-8">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {sortedTools.length} {sortedTools.length === 1 ? 'tool' : 'tools'} available
            </span>
          </div>
          {selectedCategory !== "all" && (
            <div className="text-sm text-muted-foreground">
              Category: {selectedCategory.replace(/_/g, ' ')}
            </div>
          )}
        </div>

        {/* Platform Tools Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Platform Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🎨 Generate Image
                  <Badge variant="secondary">Built-in</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Create high-quality images from text prompts using advanced AI models like AnythingV5.
                </p>
                <div className="flex items-center gap-2">
                  <Badge className="text-xs">art_creation</Badge>
                  <Badge variant="outline" className="text-xs">Core</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🎬 Generate Video
                  <Badge variant="secondary">Built-in</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Create short video clips and animations from text descriptions.
                </p>
                <div className="flex items-center gap-2">
                  <Badge className="text-xs">art_creation</Badge>
                  <Badge variant="outline" className="text-xs">Core</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📋 List Models
                  <Badge variant="secondary">Built-in</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Explore and discover available AI models for different creative styles.
                </p>
                <div className="flex items-center gap-2">
                  <Badge className="text-xs">utility</Badge>
                  <Badge variant="outline" className="text-xs">Core</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Custom Tools Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Code className="h-6 w-6 text-accent" />
            Custom Tools
          </h2>
          
          {/* Custom Tools Display */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading tools...</p>
            </div>
          ) : sortedTools.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No custom tools found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== "all" 
                  ? "Try adjusting your search or filters"
                  : "Create your first custom tool to extend agent capabilities!"
                }
              </p>
              {(!searchTerm && selectedCategory === "all") && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tool
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} onUpdate={refetch} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Tool Modal */}
      <CreateToolModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={refetch}
      />
    </div>
  );
} 