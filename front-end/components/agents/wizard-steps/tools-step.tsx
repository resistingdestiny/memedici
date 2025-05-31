"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Wrench, Brain, Database, Plus, X, ExternalLink } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AgentConfigFormData } from "../create-agent-wizard";

interface ToolsStepProps {
  form: UseFormReturn<AgentConfigFormData>;
}

const PLATFORM_TOOLS = [
  {
    id: "generate_image",
    name: "Generate Image",
    description: "Create images from text descriptions",
    category: "Creation"
  },
  {
    id: "generate_video",
    name: "Generate Video",
    description: "Create short video clips",
    category: "Creation"
  },
  {
    id: "list_available_models",
    name: "List Available Models",
    description: "Query available AI models",
    category: "System"
  },
  {
    id: "analyze_artwork",
    name: "Analyze Artwork",
    description: "Analyze and critique visual art",
    category: "Analysis"
  },
  {
    id: "color_palette_generator",
    name: "Color Palette Generator",
    description: "Generate color schemes",
    category: "Utility"
  },
  {
    id: "style_transfer",
    name: "Style Transfer",
    description: "Apply artistic styles to images",
    category: "Transformation"
  },
  {
    id: "composition_analysis",
    name: "Composition Analysis",
    description: "Analyze visual composition",
    category: "Analysis"
  },
  {
    id: "market_insights",
    name: "Market Insights",
    description: "Get art market data and trends",
    category: "Business"
  }
];

interface CustomTool {
  name: string;
  description: string;
  endpoint: string;
}

export function ToolsStep({ form }: ToolsStepProps) {
  const [showCustomToolModal, setShowCustomToolModal] = useState(false);
  const [newCustomTool, setNewCustomTool] = useState<CustomTool>({
    name: "",
    description: "",
    endpoint: ""
  });

  const watchedMemoryEnabled = form.watch("memory_enabled");
  const watchedStructuredOutput = form.watch("structured_output");
  const watchedToolsEnabled = form.watch("tools_enabled");
  const watchedCustomTools = form.watch("custom_tools");

  const togglePlatformTool = (toolId: string) => {
    const current = watchedToolsEnabled || [];
    if (current.includes(toolId)) {
      form.setValue("tools_enabled", current.filter(t => t !== toolId));
    } else {
      form.setValue("tools_enabled", [...current, toolId]);
    }
  };

  const addCustomTool = () => {
    if (newCustomTool.name && newCustomTool.description && newCustomTool.endpoint) {
      const current = watchedCustomTools || [];
      form.setValue("custom_tools", [...current, newCustomTool]);
      setNewCustomTool({ name: "", description: "", endpoint: "" });
      setShowCustomToolModal(false);
    }
  };

  const removeCustomTool = (index: number) => {
    const current = watchedCustomTools || [];
    form.setValue("custom_tools", current.filter((_, i) => i !== index));
  };

  const groupedTools = PLATFORM_TOOLS.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, typeof PLATFORM_TOOLS>);

  return (
    <div className="space-y-6">
      {/* Memory Toggle */}
      <FormField
        control={form.control}
        name="memory_enabled"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="flex items-center gap-2 text-base">
                <Brain className="h-4 w-4" />
                Enable Memory
              </FormLabel>
              <FormDescription>
                Allow your agent to remember past interactions and learn from them
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Structured Output Toggle */}
      <FormField
        control={form.control}
        name="structured_output"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" />
                Structured Output
              </FormLabel>
              <FormDescription>
                Generate responses in structured formats (JSON, XML, etc.)
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Platform Tools */}
      <FormField
        control={form.control}
        name="tools_enabled"
        render={() => (
          <FormItem>
            <FormLabel className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4" />
              Platform Tools
            </FormLabel>
            <FormDescription>
              Select the tools your agent can use ({watchedToolsEnabled.length} selected)
            </FormDescription>
            
            <div className="space-y-4">
              {Object.entries(groupedTools).map(([category, tools]) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tools.map((tool) => (
                      <div
                        key={tool.id}
                        className={`flex items-start space-x-3 rounded-lg border p-3 transition-colors ${
                          watchedToolsEnabled.includes(tool.id)
                            ? "bg-primary/5 border-primary/20"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          id={tool.id}
                          checked={watchedToolsEnabled.includes(tool.id)}
                          onCheckedChange={() => togglePlatformTool(tool.id)}
                        />
                        <div className="flex-1 space-y-1">
                          <label
                            htmlFor={tool.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {tool.name}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Custom Tools */}
      <FormField
        control={form.control}
        name="custom_tools"
        render={() => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel className="text-base">Custom Tools</FormLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCustomToolModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tool
              </Button>
            </div>
            <FormDescription>
              Add external tools via API endpoints
            </FormDescription>
            
            {watchedCustomTools.length > 0 && (
              <div className="space-y-2">
                {watchedCustomTools.map((tool, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-muted/30 rounded-lg p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{tool.name}</h4>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {tool.endpoint}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomTool(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium text-sm mb-2">🔧 Tool Guidelines</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Memory enables learning and personalization over time</li>
          <li>• Structured output is useful for data integration</li>
          <li>• More tools = more capabilities but higher complexity</li>
          <li>• Custom tools require valid API endpoints</li>
          <li>• Generation tools are recommended for creative agents</li>
        </ul>
      </div>

      {/* Custom Tool Modal */}
      <Dialog open={showCustomToolModal} onOpenChange={setShowCustomToolModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Tool</DialogTitle>
            <DialogDescription>
              Add an external tool that your agent can use via API endpoint.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tool Name</label>
              <Input
                placeholder="e.g., Weather API"
                value={newCustomTool.name}
                onChange={(e) => setNewCustomTool(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                placeholder="Describe what this tool does..."
                value={newCustomTool.description}
                onChange={(e) => setNewCustomTool(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">API Endpoint</label>
              <Input
                placeholder="https://api.example.com/v1/tool"
                value={newCustomTool.endpoint}
                onChange={(e) => setNewCustomTool(prev => ({ ...prev, endpoint: e.target.value }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCustomToolModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={addCustomTool}
              disabled={!newCustomTool.name || !newCustomTool.description || !newCustomTool.endpoint}
            >
              Add Tool
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 