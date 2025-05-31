"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Sparkles, ImagePlus } from "lucide-react";
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
import { sendPrompt } from "@/lib/stubs";
import { type Agent } from "@/lib/stubs";

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
  
  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      promptText: "",
    },
  });

  const onSubmit = async (data: PromptFormValues) => {
    setIsSubmitting(true);
    
    try {
      await sendPrompt(agent.id, data.promptText);
      setIsSuccess(true);
      
      // Reset form
      form.reset();
      
      // Reset success message after 5 seconds
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      console.error("Error sending prompt:", error);
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
                    Describe your vision or concept for {agent.name} to create. Be specific about style, subject, and mood.
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder={`Example: Create a portrait of a young woman with flowing red hair against a twilight city skyline, in the style of ${agent.name}...`}
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
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
                  "Send Prompt"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}