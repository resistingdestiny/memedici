"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Sparkles, ImagePlus, MessageSquare } from "lucide-react";
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
import { httpClient } from "@/lib/http";
import { type AgentConfig, type ChatRequest, type ChatResponse } from "@/lib/types";

const promptSchema = z.object({
  promptText: z
    .string()
    .min(10, { message: "Prompt must be at least 10 characters" })
    .max(500, { message: "Prompt cannot exceed 500 characters" }),
});

type PromptFormValues = z.infer<typeof promptSchema>;

interface PromptStudioConfigProps {
  agentId: string;
  agent?: AgentConfig;
}

export function PromptStudioConfig({ agentId, agent }: PromptStudioConfigProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      promptText: "",
    },
  });

  const onSubmit = async (data: PromptFormValues) => {
    setIsSubmitting(true);
    setError(null);
    setChatResponse(null);
    
    try {
      const chatRequest: ChatRequest = {
        message: data.promptText,
        context: `Create artwork in the style of ${agent?.display_name || 'this agent'}`,
        temperature: 0.7,
        max_tokens: 1000,
      };

      const response = await httpClient.post<ChatResponse>(`/agents/${agentId}/chat`, chatRequest);
      
      if (response.data) {
        setChatResponse(response.data);
        setIsSuccess(true);
        
        // Reset form
        form.reset();
        
        // Reset success message after 5 seconds
        setTimeout(() => setIsSuccess(false), 5000);
      }
    } catch (err: any) {
      console.error("Error sending prompt:", err);
      setError(err.response?.data?.message || "Failed to send prompt. Please try again.");
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
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="promptText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">
                    Create with {agent?.display_name || 'Agent'}
                  </FormLabel>
                  <FormDescription>
                    Describe your vision or concept for {agent?.display_name || 'this agent'} to create. Be specific about style, subject, and mood.
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder={`Example: Create a portrait of a young woman with flowing red hair against a twilight city skyline, in the style of ${agent?.display_name || 'this agent'}...`}
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
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
                    Sending...
                  </>
                ) : isSuccess ? (
                  "Prompt Sent!"
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send Prompt
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Chat Response */}
        {chatResponse && (
          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Response from {agent?.display_name || 'Agent'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{chatResponse.message}</p>
              {chatResponse.metadata && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    {chatResponse.metadata.tokens_used && (
                      <span>Tokens used: {chatResponse.metadata.tokens_used}</span>
                    )}
                    {chatResponse.metadata.processing_time && (
                      <span>Processing time: {chatResponse.metadata.processing_time}ms</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
} 