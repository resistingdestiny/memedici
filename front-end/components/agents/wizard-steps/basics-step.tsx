"use client";

import { UseFormReturn } from "react-hook-form";
import { Upload, User, Sparkles, BookOpen } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgentConfigFormData } from "../create-agent-wizard";

interface BasicsStepProps {
  form: UseFormReturn<AgentConfigFormData>;
}

const ARCHETYPE_SUGGESTIONS = [
  "Neo-Renaissance Painter",
  "Cyber-punk Fashion Designer", 
  "Mystical Digital Sculptor",
  "Quantum Jazz Composer",
  "Abstract Geometry Artist",
  "Surreal Photographer",
  "Cosmic Visual Poet",
  "Bio-tech Installation Creator",
];

export function BasicsStep({ form }: BasicsStepProps) {
  const watchedOriginStory = form.watch("origin_story");
  const wordCount = watchedOriginStory ? watchedOriginStory.split(" ").filter(word => word.length > 0).length : 0;
  const remainingWords = 40 - wordCount;

  const handleArchetypeSelect = (archetype: string) => {
    form.setValue("archetype", archetype);
  };

  const handleAvatarUpload = () => {
    // TODO: Implement IPFS upload or URL input
    console.log("Avatar upload not implemented yet");
  };

  return (
    <div className="space-y-6">
      {/* Display Name */}
      <FormField
        control={form.control}
        name="display_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Display Name *
            </FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Vesper Flux"
                maxLength={60}
                {...field}
              />
            </FormControl>
            <FormDescription>
              Human-readable name (max 60 characters)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Avatar */}
      <FormField
        control={form.control}
        name="avatar_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Avatar</FormLabel>
            <FormControl>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
                  {field.value ? (
                    <img
                      src={field.value}
                      alt="Avatar preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex flex-col items-center gap-2 h-full"
                      onClick={handleAvatarUpload}
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload Image</span>
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Or enter image URL (https:// or ipfs://)"
                  value={field.value}
                  onChange={field.onChange}
                />
              </div>
            </FormControl>
            <FormDescription>
              Upload to IPFS or provide a URL (optional)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Archetype */}
      <FormField
        control={form.control}
        name="archetype"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Archetype *
            </FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Cyber-punk Fashion Designer"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Creative archetype or persona type
            </FormDescription>
            <div className="flex flex-wrap gap-2 mt-2">
              {ARCHETYPE_SUGGESTIONS.map((suggestion) => (
                <Badge
                  key={suggestion}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => handleArchetypeSelect(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Origin Story */}
      <FormField
        control={form.control}
        name="origin_story"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Origin Story *
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="e.g., Stitched in a neon Tokyo back-alley, she weaves code into couture."
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormDescription>
              <div className="flex items-center justify-between">
                <span>Brief backstory of your agent's creation (max 40 words)</span>
                <span className={`text-sm ${remainingWords < 0 ? 'text-destructive' : remainingWords < 10 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                  {wordCount}/40 words {remainingWords < 0 && `(${Math.abs(remainingWords)} over limit)`}
                </span>
              </div>
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium text-sm mb-2">💡 Tips for Great Basics</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Choose a memorable display name that reflects the agent's personality</li>
          <li>• Select an archetype that clearly defines the agent's creative niche</li>
          <li>• Keep the origin story concise but evocative - it sets the tone</li>
          <li>• Avatar helps users connect with your agent visually</li>
        </ul>
      </div>
    </div>
  );
} 