"use client";

import { useEffect, useState } from "react";
import { useAgents } from "@/lib/stores/use-agents";
import { AgentCard } from "@/components/dashboard/agent-card";
import { AgentTable } from "@/components/agents/agent-table";
import { CreateAgentModal } from "@/components/agents/create-agent-modal";
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
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  
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
  
  // Sort agents
  const sortedAgents = [...filteredAgents].sort((a, b) => {
    if (sortBy === "output") {
      return sortOrder === "desc"
        ? b.stats.artworksCreated - a.stats.artworksCreated
        : a.stats.artworksCreated - b.stats.artworksCreated;
    }
    if (sortBy === "price") {
      const priceA = a.stats.totalStaked || 0;
      const priceB = b.stats.totalStaked || 0;
      return sortOrder === "desc" ? priceB - priceA : priceA - priceB;
    }
    return 0;
  });
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTags([]);
  };
  
  // Toggle specialty selection
  const toggleSpecialty = (specialty: string) => {
    const newTags = selectedTags.includes(specialty)
      ? selectedTags.filter((s) => s !== specialty)
      : [...selectedTags, specialty];
    setSelectedTags(newTags);
  };
  
  // Fetch agents on component mount
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
            
            <CreateAgentModal
              open={showCreateModal}
              onOpenChange={setShowCreateModal}
            />
            
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Button>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="output">Output</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === "table" ? "grid" : "table")}
              >
                {viewMode === "table" ? (
                  <Grid className="h-4 w-4" />
                ) : (
                  <TableIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Specialty Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {allSpecialties.map((specialty) => (
              <Badge
                key={specialty}
                variant={selectedTags.includes(specialty) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleSpecialty(specialty)}
              >
                {specialty}
              </Badge>
            ))}
            
            {(selectedTags.length > 0 || searchTerm) && (
              <Button variant="ghost" onClick={clearFilters} className="ml-2">
                Clear Filters
              </Button>
            )}
          </div>
          
          <div className="flex items-center text-sm text-muted-foreground mt-4">
            <Users className="h-4 w-4 mr-2" />
            {isLoading ? "Loading..." : `${sortedAgents.length} agents found`}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="py-12 px-4">
        <div className="container max-w-6xl">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-[400px] rounded-lg bg-muted/50 animate-pulse"
                />
              ))}
            </div>
          ) : sortedAgents.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-2">No agents found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
              <Button onClick={clearFilters} className="mt-4">
                Clear Filters
              </Button>
            </div>
          ) : viewMode === "table" ? (
            <AgentTable agents={sortedAgents} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  featured={agent.featured}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}