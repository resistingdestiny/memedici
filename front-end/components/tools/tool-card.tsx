"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Play, 
  Activity, 
  Clock, 
  ExternalLink,
  AlertTriangle
} from "lucide-react";
import { Tool } from "@/hooks/useTools";
import { deleteTool } from "@/lib/api";

interface ToolCardProps {
  tool: Tool;
  onUpdate: () => void;
}

export function ToolCard({ tool, onUpdate }: ToolCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${tool.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteTool(tool.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete tool:', error);
      alert('Failed to delete tool. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTest = () => {
    // TODO: Implement tool testing functionality
    console.log('Testing tool:', tool.name);
  };

  const handleEdit = () => {
    // TODO: Implement tool editing functionality
    console.log('Editing tool:', tool.name);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'art_creation':
        return '🎨';
      case 'analysis':
        return '📊';
      case 'enhancement':
        return '✨';
      case 'blockchain':
        return '⛓️';
      case 'utility':
        return '🛠️';
      default:
        return '🔧';
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card className="relative group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getCategoryIcon(tool.category)}</span>
            <CardTitle className="text-lg font-semibold">{tool.name}</CardTitle>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleTest}>
                <Play className="mr-2 h-4 w-4" />
                Test Tool
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEdit}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {tool.api_config?.endpoint && (
                <DropdownMenuItem 
                  onClick={() => window.open(tool.api_config?.endpoint, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Endpoint
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-destructive"
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={getStatusColor(tool.status)}>
            {tool.status || 'unknown'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {tool.category.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {tool.description}
        </p>

        {/* API Configuration Preview */}
        {tool.api_config && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span className="font-mono">
                {tool.api_config.method} {tool.api_config.endpoint}
              </span>
            </div>
            {tool.api_config.auth && (
              <div className="flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-amber-600">Authenticated</span>
              </div>
            )}
          </div>
        )}

        {/* Usage Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3" />
            <span>{tool.usage_count || 0} uses</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Created {formatDate(tool.created_at)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 