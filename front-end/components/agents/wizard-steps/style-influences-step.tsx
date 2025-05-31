"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Palette, Tag, Users, Brush, Plus, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { AgentConfigFormData } from "../create-agent-wizard";

interface StyleInfluencesStepProps {
  form: UseFormReturn<AgentConfigFormData>;
}

const CORE_TRAITS_OPTIONS = [
  "bold", "experimental", "mystical", "precise", "chaotic", "minimalist",
  "vibrant", "moody", "futuristic", "nostalgic", "organic", "geometric",
  "emotional", "technical", "playful", "serious", "abstract", "realistic"
];

const PRIMARY_MEDIUMS_OPTIONS = [
  "oil painting", "digital art", "photography", "sculpture", "watercolor",
  "acrylic", "mixed media", "3D modeling", "voxel art", "pixel art",
  "vector art", "charcoal", "pastels", "ink", "collage", "installation"
];

const INFLUENCE_SUGGESTIONS = [
  "Leonardo da Vinci", "Pablo Picasso", "Vincent van Gogh", "Frida Kahlo",
  "Andy Warhol", "Banksy", "Yves Klein", "Salvador Dalí", "Georgia O'Keeffe",
  "Michelangelo", "Beeple", "Alex Grey", "Takashi Murakami", "Basquiat"
];

const PRESET_PALETTES = [
  { name: "Cyber Neon", colors: ["#0FF0FC", "#FF006E", "#8338EC", "#3A86FF", "#06FFA5"] },
  { name: "Earth Tones", colors: ["#8B4513", "#D2B48C", "#F4A460", "#CD853F", "#A0522D"] },
  { name: "Ocean Depths", colors: ["#003366", "#004080", "#0066CC", "#3399FF", "#66B2FF"] },
  { name: "Sunset Warm", colors: ["#FF6B35", "#F7931E", "#FFD23F", "#EE4B2B", "#FF69B4"] },
  { name: "Monochrome", colors: ["#000000", "#333333", "#666666", "#999999", "#CCCCCC"] }
];

export function StyleInfluencesStep({ form }: StyleInfluencesStepProps) {
  const [customTraitInput, setCustomTraitInput] = useState("");
  const [customMediumInput, setCustomMediumInput] = useState("");
  const [motifInput, setMotifInput] = useState("");
  const [influenceInput, setInfluenceInput] = useState("");
  const [customColorInput, setCustomColorInput] = useState("");

  const watchedCoreTraits = form.watch("core_traits");
  const watchedPrimaryMediums = form.watch("primary_mediums");
  const watchedSignatureMotifs = form.watch("signature_motifs");
  const watchedInfluences = form.watch("influences");
  const watchedColourPalette = form.watch("colour_palette");

  const toggleCoreTrait = (trait: string) => {
    const current = watchedCoreTraits || [];
    if (current.includes(trait)) {
      form.setValue("core_traits", current.filter(t => t !== trait));
    } else if (current.length < 5) {
      form.setValue("core_traits", [...current, trait]);
    }
  };

  const togglePrimaryMedium = (medium: string) => {
    const current = watchedPrimaryMediums || [];
    if (current.includes(medium)) {
      form.setValue("primary_mediums", current.filter(m => m !== medium));
    } else {
      form.setValue("primary_mediums", [...current, medium]);
    }
  };

  const addCustomTrait = () => {
    if (customTraitInput.trim() && !watchedCoreTraits.includes(customTraitInput.trim()) && watchedCoreTraits.length < 5) {
      form.setValue("core_traits", [...watchedCoreTraits, customTraitInput.trim()]);
      setCustomTraitInput("");
    }
  };

  const addCustomMedium = () => {
    if (customMediumInput.trim() && !watchedPrimaryMediums.includes(customMediumInput.trim())) {
      form.setValue("primary_mediums", [...watchedPrimaryMediums, customMediumInput.trim()]);
      setCustomMediumInput("");
    }
  };

  const addMotif = () => {
    if (motifInput.trim() && !watchedSignatureMotifs.includes(motifInput.trim())) {
      form.setValue("signature_motifs", [...watchedSignatureMotifs, motifInput.trim()]);
      setMotifInput("");
    }
  };

  const removeMotif = (motif: string) => {
    form.setValue("signature_motifs", watchedSignatureMotifs.filter(m => m !== motif));
  };

  const addInfluence = (influence: string) => {
    if (!watchedInfluences.includes(influence)) {
      form.setValue("influences", [...watchedInfluences, influence]);
    }
  };

  const addCustomInfluence = () => {
    if (influenceInput.trim() && !watchedInfluences.includes(influenceInput.trim())) {
      form.setValue("influences", [...watchedInfluences, influenceInput.trim()]);
      setInfluenceInput("");
    }
  };

  const removeInfluence = (influence: string) => {
    form.setValue("influences", watchedInfluences.filter(i => i !== influence));
  };

  const addColor = (color: string) => {
    if (color && !watchedColourPalette.includes(color) && watchedColourPalette.length < 6) {
      form.setValue("colour_palette", [...watchedColourPalette, color]);
    }
  };

  const addCustomColor = () => {
    const color = customColorInput.trim();
    if (color && !watchedColourPalette.includes(color) && watchedColourPalette.length < 6) {
      form.setValue("colour_palette", [...watchedColourPalette, color]);
      setCustomColorInput("");
    }
  };

  const removeColor = (color: string) => {
    form.setValue("colour_palette", watchedColourPalette.filter(c => c !== color));
  };

  const applyPresetPalette = (palette: typeof PRESET_PALETTES[0]) => {
    form.setValue("colour_palette", palette.colors);
  };

  return (
    <div className="space-y-6">
      {/* Core Traits */}
      <FormField
        control={form.control}
        name="core_traits"
        render={() => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Core Traits (3-5) *
            </FormLabel>
            <FormDescription>
              Select 3-5 defining characteristics of your agent ({watchedCoreTraits.length}/5)
            </FormDescription>
            <div className="flex flex-wrap gap-2 mb-4">
              {CORE_TRAITS_OPTIONS.map((trait) => (
                <Badge
                  key={trait}
                  variant={watchedCoreTraits.includes(trait) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => toggleCoreTrait(trait)}
                >
                  {trait}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom trait"
                value={customTraitInput}
                onChange={(e) => setCustomTraitInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTrait())}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCustomTrait}
                disabled={watchedCoreTraits.length >= 5}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Primary Mediums */}
      <FormField
        control={form.control}
        name="primary_mediums"
        render={() => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Brush className="h-4 w-4" />
              Primary Mediums *
            </FormLabel>
            <FormDescription>
              Creative mediums your agent specializes in
            </FormDescription>
            <div className="flex flex-wrap gap-2 mb-4">
              {PRIMARY_MEDIUMS_OPTIONS.map((medium) => (
                <Badge
                  key={medium}
                  variant={watchedPrimaryMediums.includes(medium) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => togglePrimaryMedium(medium)}
                >
                  {medium}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom medium"
                value={customMediumInput}
                onChange={(e) => setCustomMediumInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomMedium())}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCustomMedium}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Signature Motifs */}
      <FormField
        control={form.control}
        name="signature_motifs"
        render={() => (
          <FormItem>
            <FormLabel>Signature Motifs</FormLabel>
            <FormDescription>
              Recurring visual concepts and themes (optional)
            </FormDescription>
            <div className="flex flex-wrap gap-2 mb-2">
              {watchedSignatureMotifs.map((motif) => (
                <Badge key={motif} variant="secondary" className="gap-1">
                  {motif}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeMotif(motif)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., spiral staircases, glitch patterns"
                value={motifInput}
                onChange={(e) => setMotifInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMotif())}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addMotif}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </FormItem>
        )}
      />

      {/* Influences */}
      <FormField
        control={form.control}
        name="influences"
        render={() => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Influences
            </FormLabel>
            <FormDescription>
              Artists, styles, movements that inspire the agent
            </FormDescription>
            <div className="flex flex-wrap gap-2 mb-4">
              {INFLUENCE_SUGGESTIONS.map((influence) => (
                <Badge
                  key={influence}
                  variant={watchedInfluences.includes(influence) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => addInfluence(influence)}
                >
                  {influence}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {watchedInfluences.map((influence) => (
                <Badge key={influence} variant="secondary" className="gap-1">
                  {influence}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeInfluence(influence)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom influence"
                value={influenceInput}
                onChange={(e) => setInfluenceInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomInfluence())}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCustomInfluence}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </FormItem>
        )}
      />

      {/* Color Palette */}
      <FormField
        control={form.control}
        name="colour_palette"
        render={() => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Color Palette (max 6)
            </FormLabel>
            <FormDescription>
              Preferred colors for your agent's work ({watchedColourPalette.length}/6)
            </FormDescription>
            
            {/* Preset Palettes */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Quick Presets:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_PALETTES.map((palette) => (
                  <Button
                    key={palette.name}
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2 justify-start h-auto p-2"
                    onClick={() => applyPresetPalette(palette)}
                  >
                    <div className="flex gap-1">
                      {palette.colors.slice(0, 5).map((color, index) => (
                        <div
                          key={index}
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="text-sm">{palette.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Current Palette */}
            <div className="flex flex-wrap gap-2 mb-2">
              {watchedColourPalette.map((color) => (
                <div
                  key={color}
                  className="flex items-center gap-1 bg-secondary rounded-md p-1"
                >
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-mono">{color}</span>
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => removeColor(color)}
                  />
                </div>
              ))}
            </div>
            
            {/* Custom Color Input */}
            <div className="flex gap-2">
              <Input
                placeholder="#FF5733 or color name"
                value={customColorInput}
                onChange={(e) => setCustomColorInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomColor())}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCustomColor}
                disabled={watchedColourPalette.length >= 6}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </FormItem>
        )}
      />

      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium text-sm mb-2">🎨 Style Guidelines</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Core traits define your agent's creative personality</li>
          <li>• Primary mediums should reflect the agent's main artistic skills</li>
          <li>• Signature motifs make your agent's work recognizable</li>
          <li>• Influences help establish artistic context and quality expectations</li>
          <li>• Color palettes guide the visual aesthetics of generated work</li>
        </ul>
      </div>
    </div>
  );
} 