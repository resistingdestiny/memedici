"use client";

import { useState } from "react";
import { useListAgents } from "@/hooks/useListAgents";
import { AgentCardConfig } from "@/components/dashboard/agent-card-config";
import { AgentTable } from "@/components/agents/agent-table";
import { CreateAgentWizard } from "@/components/agents/create-agent-wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Users, Grid, Table as TableIcon, Plus, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AgentsPage() {
  const { data: agents, isLoading, isError, error, refetch } = useListAgents();
  
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"price" | "output" | "date">("output");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
  
  // Extract all unique traits from agents
  const allTraits = Array.from(
    new Set(agents.flatMap((agent) => agent.core_traits))
  );
  
  // Filter agents based on search term and selected traits
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      searchTerm === "" ||
      agent.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.origin_story.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.archetype.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTraits =
      selectedTags.length === 0 ||
      selectedTags.some((trait) =>
        agent.core_traits.includes(trait)
      );
    
    return matchesSearch && matchesTraits;
  });

  // Sort filtered agents
  const sortedAgents = [...filteredAgents].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case "price":
        aValue = a.stats?.totalStaked || 0;
        bValue = b.stats?.totalStaked || 0;
        break;
      case "output":
        aValue = a.stats?.artworksCreated || 0;
        bValue = b.stats?.artworksCreated || 0;
        break;
      case "date":
        // Since there's no createdAt in the AgentConfig interface, use display_name as fallback
        aValue = a.display_name.toLowerCase();
        bValue = b.display_name.toLowerCase();
        return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      default:
        return 0;
    }
    
    return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
  });

  return (
    <div className="min-h-screen pt-16">
      {/* Header */}
      <div className="bg-muted/30 py-12 px-4">
        <div className="container max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 font-cinzel">
                Agent Marketplace
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Discover, trade, and invest in AI creators. Each agent brings unique capabilities and earning potential.
              </p>
            </div>
            
            <Button onClick={() => setShowCreateWizard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Button>
          </div>

          {/* Error Alert */}
          {isError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load agents from server. Showing cached data. 
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
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Sort */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [sort, order] = value.split('-');
              setSortBy(sort as any);
              setSortOrder(order as any);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="output-desc">Most Productive</SelectItem>
                <SelectItem value="output-asc">Least Productive</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
            
            {/* View Mode */}
            <div className="flex rounded-lg border">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="flex-1 rounded-r-none"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="flex-1 rounded-l-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Trait Tags */}
          {allTraits.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {allTraits.slice(0, 10).map((trait) => (
                  <Badge
                    key={trait}
                    variant={selectedTags.includes(trait) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (selectedTags.includes(trait)) {
                        setSelectedTags(selectedTags.filter(tag => tag !== trait));
                      } else {
                        setSelectedTags([...selectedTags, trait]);
                      }
                    }}
                  >
                    {trait}
                  </Badge>
                ))}
                {selectedTags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTags([])}
                    className="h-6 px-2 text-xs"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-6xl py-8 px-4">
        {/* Stats */}
        <div className="flex items-center gap-6 mb-8">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {sortedAgents.length} {sortedAgents.length === 1 ? 'agent' : 'agents'} available
            </span>
          </div>
          {selectedTags.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Filtered by: {selectedTags.join(', ')}
            </div>
          )}
        </div>

        {/* Agents Display */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading agents...</p>
          </div>
        ) : sortedAgents.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No agents found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedTags.length > 0 
                ? "Try adjusting your search or filters"
                : "Be the first to create an agent!"
              }
            </p>
            {(!searchTerm && selectedTags.length === 0) && (
              <Button onClick={() => setShowCreateWizard(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Agent
              </Button>
            )}
          </div>
        ) : viewMode === "table" ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Table view coming soon...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedAgents.map((agent) => (
              <AgentCardConfig key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>

      {/* Create Agent Wizard */}
      <CreateAgentWizard
        open={showCreateWizard}
        onOpenChange={setShowCreateWizard}
      />
    </div>
  );
}