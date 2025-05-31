"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Brain, Volume2, Sliders, MessageCircle, Users, Plus, X } from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgentConfigFormData } from "../create-agent-wizard";

interface BehaviourStepProps {
  form: UseFormReturn<AgentConfigFormData>;
}

const VOICE_STYLE_SUGGESTIONS = [
  "Flowery Renaissance prose",
  "Short, punchy runway notes",
  "Mystical and poetic, speaks in metaphors",
  "Technical yet artistic, speaks in code metaphors",
  "Casual and conversational",
  "Formal and scholarly",
  "Playful and energetic",
  "Contemplative and philosophical"
];

const COLLABORATION_SUGGESTIONS = [
  "streetwear", "cyber-punk", "surrealism", "meditation", "cosmic-art",
  "architecture", "fashion", "technology", "nature", "music", "poetry",
  "photography", "sculpture", "performance", "installation"
];

export function BehaviourStep({ form }: BehaviourStepProps) {
  const [collabInput, setCollabInput] = useState("");

  const watchedCreationRate = form.watch("creation_rate");
  const watchedTemperature = form.watch("temperature");
  const watchedCollabAffinity = form.watch("collab_affinity");

  const addCollabAffinity = (affinity: string) => {
    if (!watchedCollabAffinity.includes(affinity)) {
      form.setValue("collab_affinity", [...watchedCollabAffinity, affinity]);
    }
  };

  const addCustomCollabAffinity = () => {
    if (collabInput.trim() && !watchedCollabAffinity.includes(collabInput.trim())) {
      form.setValue("collab_affinity", [...watchedCollabAffinity, collabInput.trim()]);
      setCollabInput("");
    }
  };

  const removeCollabAffinity = (affinity: string) => {
    form.setValue("collab_affinity", watchedCollabAffinity.filter(a => a !== affinity));
  };

  const setVoiceStyle = (style: string) => {
    form.setValue("voice_style", style);
  };

  return (
    <div className="space-y-6">
      {/* Creation Rate */}
      <FormField
        control={form.control}
        name="creation_rate"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Sliders className="h-4 w-4" />
              Creation Rate
            </FormLabel>
            <FormControl>
              <div className="space-y-4">
                <Slider
                  value={[field.value]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value) => field.onChange(value[0])}
                  className="w-full"
                />
                <div className="flex items-center justify-between text-sm">
                  <span>1 work/day</span>
                  <span className="font-medium">{field.value} works/day</span>
                  <span>10 works/day</span>
                </div>
              </div>
            </FormControl>
            <FormDescription>
              How many creative works your agent produces per day
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Voice Style */}
      <FormField
        control={form.control}
        name="voice_style"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Voice Style
            </FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Flowery Renaissance prose"
                {...field}
              />
            </FormControl>
            <FormDescription>
              How your agent communicates and expresses itself
            </FormDescription>
            <div className="flex flex-wrap gap-2 mt-2">
              {VOICE_STYLE_SUGGESTIONS.map((suggestion) => (
                <Badge
                  key={suggestion}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => setVoiceStyle(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Model Selection */}
      <FormField
        control={form.control}
        name="model_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Model
            </FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-3.5-turbo">
                    <div className="flex flex-col">
                      <span>GPT-3.5 Turbo (Default)</span>
                      <span className="text-xs text-muted-foreground">Fast and efficient</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="gpt-4o">
                    <div className="flex flex-col">
                      <span>GPT-4o</span>
                      <span className="text-xs text-muted-foreground">More creative and nuanced</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormDescription>
              The AI model powering your agent's intelligence
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Temperature */}
      <FormField
        control={form.control}
        name="temperature"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Creativity Temperature
            </FormLabel>
            <FormControl>
              <div className="space-y-4">
                <Slider
                  value={[field.value]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={(value) => field.onChange(value[0])}
                  className="w-full"
                />
                <div className="flex items-center justify-between text-sm">
                  <span>0.0 (Focused)</span>
                  <span className="font-medium">{field.value.toFixed(1)}</span>
                  <span>1.0 (Creative)</span>
                </div>
              </div>
            </FormControl>
            <FormDescription>
              Controls randomness in responses. Higher = more creative, Lower = more focused
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Collaboration Affinity */}
      <FormField
        control={form.control}
        name="collab_affinity"
        render={() => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Collaboration Affinity
            </FormLabel>
            <FormDescription>
              Topics and styles your agent enjoys collaborating on
            </FormDescription>
            <div className="flex flex-wrap gap-2 mb-4">
              {COLLABORATION_SUGGESTIONS.map((suggestion) => (
                <Badge
                  key={suggestion}
                  variant={watchedCollabAffinity.includes(suggestion) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => addCollabAffinity(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {watchedCollabAffinity.map((affinity) => (
                <Badge key={affinity} variant="secondary" className="gap-1">
                  {affinity}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeCollabAffinity(affinity)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom collaboration interest"
                value={collabInput}
                onChange={(e) => setCollabInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomCollabAffinity())}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCustomCollabAffinity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </FormItem>
        )}
      />

      {/* Custom Instructions */}
      <FormField
        control={form.control}
        name="custom_instructions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Custom Instructions</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Any specific instructions or guidelines for your agent's behavior..."
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Optional specific instructions for how your agent should behave
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium text-sm mb-2">🎭 Behavior Guidelines</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Creation rate affects how prolific your agent appears to be</li>
          <li>• Voice style shapes personality and communication patterns</li>
          <li>• GPT-4o offers more creativity but costs more to run</li>
          <li>• Temperature 0.7 is a good balance of creativity and coherence</li>
          <li>• Collaboration affinity helps match your agent with relevant projects</li>
        </ul>
      </div>
    </div>
  );
} 