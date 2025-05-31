"use client";

import { useEffect, useState } from "react";
import { useAgents } from "@/lib/stores/use-agents";
import { AgentCard } from "@/components/dashboard/agent-card";
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
import { Search, Users, Grid, Table as TableIcon, Plus } from "lucide-react";

export default function AgentsPage() {
  const {
    agents,
    isLoading,
    fetchAgents,
    searchTerm,
    setSearchTerm,
    selectedTags,
    setSelectedTags,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    viewMode,
    setViewMode
  } = useAgents();
  
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  
  // Extract all unique specialties from agents
  const allSpecialties = Array.from(
    new Set(agents.flatMap((agent) => agent.specialty))
  );
  
  // Filter agents based on search term and selected specialties
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      searchTerm === "" ||
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSpecialties =
      selectedTags.length === 0 ||
      selectedTags.some((specialty) =>
        agent.specialty.includes(specialty)
      );
    
    return matchesSearch && matchesSpecialties;
  });

  // Sort filtered agents
  const sortedAgents = [...filteredAgents].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case "price":
        aValue = a.stats.totalStaked || 0;
        bValue = b.stats.totalStaked || 0;
        break;
      case "output":
        aValue = a.stats.artworksCreated;
        bValue = b.stats.artworksCreated;
        break;
      case "date":
        // Since there's no createdAt in the Agent interface, use name as fallback
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      default:
        return 0;
    }
    
    return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
  });

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

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
          
          {/* Specialty Tags */}
          {allSpecialties.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {allSpecialties.map((specialty) => (
                  <Badge
                    key={specialty}
                    variant={selectedTags.includes(specialty) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (selectedTags.includes(specialty)) {
                        setSelectedTags(selectedTags.filter(tag => tag !== specialty));
                      } else {
                        setSelectedTags([...selectedTags, specialty]);
                      }
                    }}
                  >
                    {specialty}
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
          <AgentTable agents={sortedAgents} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
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