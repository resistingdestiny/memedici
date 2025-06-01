"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Sparkles, ImagePlus, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sendPrompt } from "@/lib/stubs";
import { type Agent } from "@/lib/stubs";
import { type ChatResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const promptSchema = z.object({
  promptText: z
    .string()
    .min(10, { message: "Prompt must be at least 10 characters" })
    .max(500, { message: "Prompt cannot exceed 500 characters" }),
});

type PromptFormValues = z.infer<typeof promptSchema>;

interface PromptStudioProps {
  agent: Agent;
}

export function PromptStudio({ agent }: PromptStudioProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [generatedArtworks, setGeneratedArtworks] = useState<ChatResponse['assets']>(undefined);
  
  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      promptText: "",
    },
  });

  // Generate style description based on agent data
  const getAgentStyleDescription = () => {
    const elements = [];
    
    if (agent.specialty && agent.specialty.length > 0) {
      elements.push(`specializing in ${agent.specialty.join(', ')}`);
    }
    
    if (agent.collective) {
      elements.push(`from the ${agent.collective} tradition`);
    }
    
    if (agent.description) {
      elements.push(agent.description.toLowerCase());
    }
    
    return elements.length > 0 
      ? `${agent.name} will create artwork ${elements.join(', ')}.`
      : `${agent.name} will create artwork in their distinctive style.`;
  };

  // Generate example prompts based on agent style
  const getExamplePrompt = () => {
    const basePrompts = [
      "a portrait of a young woman with flowing hair",
      "a mystical landscape at twilight", 
      "an abstract composition with geometric shapes",
      "a still life with flowers and books",
      "a dynamic figure in motion"
    ];
    
    const randomBase = basePrompts[Math.floor(Math.random() * basePrompts.length)];
    return `Create ${randomBase}, emphasizing ${agent.specialty?.[0] || 'your signature style'} with ${agent.specialty?.[1] || 'artistic flair'}...`;
  };

  const onSubmit = async (data: PromptFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setResponse(null);
    setGeneratedArtworks(undefined);
    
    try {
      const result = await sendPrompt(agent.id, data.promptText);
      
      if (result.success) {
        setIsSuccess(true);
        setResponse(result.response || "Prompt sent successfully!");
        
        // Set generated artworks if any
        if (result.assets && Object.keys(result.assets).length > 0) {
          setGeneratedArtworks(result.assets);
        }
        
        // Reset form
        form.reset();
        
        // Reset success message after 15 seconds (longer to view artworks)
        setTimeout(() => {
          setIsSuccess(false);
          setResponse(null);
          setGeneratedArtworks(undefined);
        }, 15000);
      } else {
        setErrorMessage(result.error || "Failed to send prompt. Please try again.");
      }
    } catch (error) {
      console.error("Error sending prompt:", error);
      setErrorMessage("Failed to send prompt. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-cinzel flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-primary" />
          Prompt Studio
        </CardTitle>
        
        {/* Agent Style Information */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p>{getAgentStyleDescription()}</p>
          {agent.specialty && agent.specialty.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium">Specialties:</span>
              {agent.specialty.map((spec) => (
                <Badge key={spec} variant="outline" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="promptText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">
                    Create with {agent.name}
                  </FormLabel>
                  <FormDescription>
                    Describe your vision for {agent.name} to interpret through their artistic lens. 
                    Be specific about subject, mood, and desired elements.
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder={getExamplePrompt()}
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            {/* Success message */}
            {isSuccess && response && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {response}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Generated Artworks */}
            {generatedArtworks && Object.keys(generatedArtworks).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <ImagePlus className="h-5 w-5 mr-2" />
                  Generated by {agent.name}
                </h3>
                <div className="grid gap-4">
                  {Object.entries(generatedArtworks).map(([id, artwork]) => (
                    <Card key={id} className="overflow-hidden border-primary/20">
                      <div className="aspect-square relative">
                        <img 
                          src={artwork.url} 
                          alt={artwork.prompt}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback for broken images
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f0f0f0'/%3E%3Ctext x='200' y='200' text-anchor='middle' dy='.35em' font-family='Arial, sans-serif' font-size='16' fill='%23666'%3EArtwork Loading...%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{id}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {agent.name}'s Style
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          <strong>Prompt:</strong> {artwork.prompt}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span><strong>Model:</strong> {artwork.model}</span>
                          <span><strong>Created:</strong> {artwork.created_at}</span>
                        </div>
                        
                        {/* Show agent style elements that influenced the artwork */}
                        {agent.specialty && agent.specialty.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-1">
                              <strong>Artistic Influence:</strong>
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {agent.specialty.map((spec) => (
                                <Badge key={spec} variant="outline" className="text-xs">
                                  {spec}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* Error message */}
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-2"
              >
                <ImagePlus className="h-4 w-4" />
                Add Reference
              </Button>
              
              <Button
                type="submit"
                className="ml-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating with {agent.name}...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create with {agent.name}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}