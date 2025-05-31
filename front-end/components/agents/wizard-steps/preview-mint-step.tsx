"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Eye, Code, Sparkles, Coins, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AgentConfigFormData } from "../create-agent-wizard";
import { slugify } from "@/lib/api";

interface PreviewMintStepProps {
  form: UseFormReturn<AgentConfigFormData>;
  onSubmit: (data: AgentConfigFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function PreviewMintStep({ form, onSubmit, isSubmitting }: PreviewMintStepProps) {
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  const formData = form.getValues();

  // Generate a sample prompt formula
  const generatePromptSample = () => {
    const traits = formData.core_traits.slice(0, 3).join(", ");
    const mediums = formData.primary_mediums.slice(0, 2).join(" and ");
    const motifs = formData.signature_motifs.length > 0 
      ? `, featuring ${formData.signature_motifs.slice(0, 2).join(" and ")}`
      : "";
    const influences = formData.influences.length > 0
      ? ` in the style of ${formData.influences[0]}`
      : "";
    const colors = formData.colour_palette.length > 0
      ? ` using colors ${formData.colour_palette.slice(0, 3).join(", ")}`
      : "";

    return `Create a ${traits} ${mediums} artwork${motifs}${influences}${colors}. The piece should embody the essence of ${formData.archetype} and reflect the creative spirit described as: "${formData.origin_story}"`;
  };

  // Create the full payload
  const createPayload = () => {
    const agentId = slugify(formData.display_name);
    return {
      agent_id: agentId,
      config: {
        ...formData,
        agent_type: "creative_artist",
        prompt_formula: customPrompt || generatePromptSample(),
      }
    };
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(createPayload(), null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleSubmit = async () => {
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Persona Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Agent Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt={formData.display_name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-1" />
                    <span className="text-xs">No Avatar</span>
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-bold">{formData.display_name}</h3>
                <p className="text-muted-foreground">{formData.archetype}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Origin Story</h4>
                <p className="text-sm text-muted-foreground italic">
                  "{formData.origin_story}"
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Core Traits</h4>
                <div className="flex flex-wrap gap-1">
                  {formData.core_traits.map((trait) => (
                    <Badge key={trait} variant="secondary">
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Creation Rate:</span> {formData.creation_rate} works/day
                </div>
                <div>
                  <span className="font-medium">AI Model:</span> {formData.model_name}
                </div>
                <div>
                  <span className="font-medium">Temperature:</span> {formData.temperature}
                </div>
                <div>
                  <span className="font-medium">Tools:</span> {formData.tools_enabled.length} enabled
                </div>
              </div>

              {formData.colour_palette.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Color Palette</h4>
                  <div className="flex gap-1">
                    {formData.colour_palette.map((color, index) => (
                      <div
                        key={index}
                        className="w-6 h-6 rounded border shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prompt Sample */}
      <Card>
        <Collapsible open={promptExpanded} onOpenChange={setPromptExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Prompt Sample
                </div>
                <span className="text-sm font-normal text-muted-foreground">
                  {promptExpanded ? "Collapse" : "Expand"}
                </span>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Auto-generated Prompt Formula:</h4>
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    {generatePromptSample()}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Customize Prompt (Optional):
                  </label>
                  <Textarea
                    placeholder="Enter a custom prompt formula or leave blank to use auto-generated..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will be the template used for your agent's creative process
                  </p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* JSON Preview */}
      <Card>
        <Collapsible open={jsonExpanded} onOpenChange={setJsonExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  JSON Configuration
                </div>
                <span className="text-sm font-normal text-muted-foreground">
                  {jsonExpanded ? "Collapse" : "Expand"}
                </span>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Review the full configuration that will be sent to the API
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyJson}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {copied ? "Copied!" : "Copy JSON"}
                  </Button>
                </div>
                
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96 border">
                  <code>{JSON.stringify(createPayload(), null, 2)}</code>
                </pre>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Minting Cost */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Minting to Memedici Network</h4>
                <p className="text-sm text-muted-foreground">
                  Deploy your agent to the Memedici ecosystem
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">Ready to Deploy</div>
              <div className="text-sm text-muted-foreground">Via Memedici API</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mint Button */}
      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="min-w-[200px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating Agent...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Mint Agent
            </>
          )}
        </Button>
      </div>

      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4">
        <h4 className="font-medium text-sm mb-2">🚀 What happens next?</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Your agent will be deployed to the Memedici network</li>
          <li>• A unique agent ID will be generated and assigned</li>
          <li>• You'll be redirected to your agent's profile page</li>
          <li>• Your agent will be ready to start creating and earning!</li>
          <li>• Other users can discover and interact with your agent</li>
        </ul>
      </div>
    </div>
  );
} 