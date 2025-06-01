"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { createAgent, slugify, type CreateAgentRequest, type AgentConfig } from "@/lib/api";

// Step components
import { 
  BasicsStep,
  StyleInfluencesStep, 
  BehaviourStep,
  ToolsStep,
  PreviewMintStep 
} from "./wizard-steps";

// Validation schema for the complete agent configuration
const agentConfigSchema = z.object({
  // Step 1: Basics
  display_name: z.string().min(1, "Display name is required").max(60, "Display name must be 60 characters or less"),
  avatar_url: z.string().url().optional().or(z.literal("")),
  archetype: z.string().min(1, "Archetype is required"),
  origin_story: z.string().min(1, "Origin story is required").refine(
    (val) => val.split(" ").length <= 40,
    "Origin story must be 40 words or less"
  ),
  
  // Step 2: Style & Influences
  core_traits: z.array(z.string()).min(3, "At least 3 core traits required").max(5, "Maximum 5 core traits"),
  primary_mediums: z.array(z.string()).min(1, "At least one primary medium required"),
  signature_motifs: z.array(z.string()).default([]),
  influences: z.array(z.string()).default([]),
  colour_palette: z.array(z.string()).max(6, "Maximum 6 colors").default([]),
  
  // Step 3: Behaviour
  creation_rate: z.number().min(1).max(10).default(4),
  voice_style: z.string().default(""),
  model_name: z.enum(["gpt-3.5-turbo", "gpt-4o"]).default("gpt-3.5-turbo"),
  temperature: z.number().min(0).max(1).default(0.7),
  collab_affinity: z.array(z.string()).default([]),
  custom_instructions: z.string().default(""),
  
  // Step 4: Tools
  memory_enabled: z.boolean().default(true),
  structured_output: z.boolean().default(false),
  tools_enabled: z.array(z.string()).default(["generate_image", "generate_video", "list_available_models"]),
  custom_tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    api_config: z.object({
      endpoint: z.string().url()
    }).optional()
  })).default([]),
});

export type AgentConfigFormData = AgentConfig;

const STEPS = [
  { id: 1, title: "Basics", description: "Identity & lore" },
  { id: 2, title: "Style & Influences", description: "Visual + thematic DNA" },
  { id: 3, title: "Behaviour", description: "Frequency, voice, model params" },
  { id: 4, title: "Tools", description: "What the agent can do" },
  { id: 5, title: "Preview & Mint", description: "JSON preview, prompt sample, confirm" },
];

interface CreateAgentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAgentWizard({ open, onOpenChange }: CreateAgentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<AgentConfigFormData>({
    resolver: zodResolver(agentConfigSchema),
    defaultValues: {
      display_name: "",
      avatar_url: "",
      archetype: "",
      origin_story: "",
      core_traits: [],
      primary_mediums: [],
      signature_motifs: [],
      influences: [],
      colour_palette: [],
      creation_rate: 4,
      voice_style: "",
      model_name: "gpt-3.5-turbo",
      temperature: 0.7,
      collab_affinity: [],
      custom_instructions: "",
      memory_enabled: true,
      structured_output: false,
      tools_enabled: ["generate_image", "generate_video", "list_available_models"],
      custom_tools: [],
    },
  });

  // Auto-save draft to localStorage
  useEffect(() => {
    if (open) {
      const savedDraft = localStorage.getItem("agentDraft");
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          form.reset(draft);
        } catch (error) {
          console.error("Error loading draft:", error);
        }
      }
    }
  }, [open, form]);

  // Save to localStorage on form changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (open) {
        localStorage.setItem("agentDraft", JSON.stringify(data));
      }
    });
    return () => subscription.unsubscribe();
  }, [form, open]);

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      // Clear any residual errors when moving to next step
      form.clearErrors();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Clear any residual errors when moving back
      form.clearErrors();
    }
  };

  const validateCurrentStep = async () => {
    let fieldsToValidate: (keyof AgentConfigFormData)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ["display_name", "archetype", "origin_story"];
        break;
      case 2:
        fieldsToValidate = ["core_traits", "primary_mediums"];
        break;
      case 3:
        fieldsToValidate = ["creation_rate", "model_name", "temperature"];
        break;
      case 4:
        fieldsToValidate = ["tools_enabled"];
        break;
      default:
        return true;
    }

    const result = await form.trigger(fieldsToValidate);
    return result;
  };

  const isStepValid = () => {
    const values = form.getValues();
    const errors = form.formState.errors;
    
    switch (currentStep) {
      case 1:
        const hasDisplay = values.display_name && values.display_name.trim().length > 0;
        const hasArchetype = values.archetype && values.archetype.trim().length > 0;
        const hasOrigin = values.origin_story && values.origin_story.trim().length > 0;
        return hasDisplay && hasArchetype && hasOrigin && 
               !errors.display_name && !errors.archetype && !errors.origin_story;
      case 2:
        const hasTraits = values.core_traits && values.core_traits.length >= 3;
        const hasMediums = values.primary_mediums && values.primary_mediums.length >= 1;
        return hasTraits && hasMediums && 
               !errors.core_traits && !errors.primary_mediums;
      case 3:
        return !errors.creation_rate && !errors.model_name && !errors.temperature;
      case 4:
        return !errors.tools_enabled;
      default:
        return true;
    }
  };

  // Real-time validation - trigger validation when relevant fields change
  const watchedFields = form.watch();
  useEffect(() => {
    if (open) {
      // Debounce validation to prevent excessive triggers
      const timeoutId = setTimeout(() => {
        let fieldsToValidate: (keyof AgentConfigFormData)[] = [];
        
        switch (currentStep) {
          case 1:
            fieldsToValidate = ["display_name", "archetype", "origin_story"];
            break;
          case 2:
            fieldsToValidate = ["core_traits", "primary_mediums"];
            break;
          case 3:
            fieldsToValidate = ["creation_rate", "model_name", "temperature"];
            break;
          case 4:
            fieldsToValidate = ["tools_enabled"];
            break;
        }
        
        if (fieldsToValidate.length > 0) {
          form.trigger(fieldsToValidate);
        }
      }, 300); // 300ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [watchedFields, currentStep, open, form]);

  const handleSubmit = async (data: AgentConfigFormData) => {
    setIsSubmitting(true);
    
    try {
      // Generate agent ID from display name
      const agentId = slugify(data.display_name);
      
      // Create the payload matching the API schema
      const payload: CreateAgentRequest = {
        agent_id: agentId,
        config: {
          // Core Identity Fields
          id: agentId,
          display_name: data.display_name,
          avatar_url: data.avatar_url || null,
          archetype: data.archetype,
          core_traits: data.core_traits,
          origin_story: data.origin_story,
          primary_mediums: data.primary_mediums,
          signature_motifs: data.signature_motifs || [],
          influences: data.influences || [],
          colour_palette: data.colour_palette || [],
          prompt_formula: null, // Will be auto-generated by backend
          voice_style: data.voice_style || null,
          creation_rate: data.creation_rate,
          collab_affinity: data.collab_affinity || [],
          
          // Technical Configuration
          agent_type: "creative_artist",
          model_name: data.model_name,
          temperature: data.temperature,
          max_tokens: null,
          memory_enabled: data.memory_enabled,
          structured_output: data.structured_output,
          
          // Studio fields
          studio_name: `${data.display_name}'s Studio`,
          studio_description: `A creative space for ${data.display_name} to explore ${data.primary_mediums.join(', ')} and express their artistic vision.`,
          studio_theme: data.archetype.toLowerCase().replace(/\s+/g, '_'),
          art_style: data.primary_mediums[0] || 'digital',
          studio_items: [],
          
          // Tools
          tools_enabled: data.tools_enabled || ["generate_image", "generate_video"],
          custom_tools: data.custom_tools?.map(tool => ({
            name: tool.name,
            description: tool.description,
            api_config: tool.api_config || { endpoint: "" }
          })) || [],
          
          // Custom instructions
          custom_instructions: data.custom_instructions || null,
          
          // Legacy persona fields (for compatibility)
          persona_name: data.display_name,
          persona_background: data.origin_story,
          personality_traits: data.core_traits.slice(0, 3), // Take first 3 traits
          artistic_influences: data.influences || [],
          preferred_mediums: data.primary_mediums,
          
          // Evolution fields
          interaction_count: 0,
          artworks_created: 0,
          persona_evolution_history: []
        }
      };

      // Call the real Memedici API
      const response = await createAgent(payload);
      
      if (response.success) {
        // Clear draft
        localStorage.removeItem("agentDraft");
        
        // Show success message
        toast.success("Agent created successfully! 🎉");
        
        // Close modal and redirect to agent profile
        onOpenChange(false);
        router.push(`/agents/${agentId}`);
      } else {
        throw new Error(response.error || 'Failed to create agent');
      }
      
    } catch (error: any) {
      console.error("Error creating agent:", error);
      
      // Handle validation errors (422)
      if (error.response?.status === 422) {
        const validationErrors = error.response.data?.detail;
        if (validationErrors && Array.isArray(validationErrors)) {
          // Map validation errors to form fields
          validationErrors.forEach((err: any) => {
            if (err.loc && err.msg) {
              const fieldName = err.loc[err.loc.length - 1];
              form.setError(fieldName, { 
                type: "server", 
                message: err.msg 
              });
            }
          });
          toast.error("Please fix the validation errors and try again.");
        } else {
          toast.error("Invalid data provided. Please check your inputs.");
        }
      } else if (error.response?.status === 400) {
        toast.error("Bad request. Please check your data and try again.");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later.");
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        toast.error("Network error. Please check your connection and try again.");
      } else {
        const errorMessage = error?.response?.data?.detail || error?.message || "Something went wrong";
        toast.error(`Error: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Randomize function for testing
  const randomizeForm = () => {
    // Predefined lists for random selection
    const names = [
      "Cosmic Vesper", "Neon Zara", "Pixel Aurora", "Cyber Luna", "Digital Sage",
      "Quantum Echo", "Neural Nova", "Synth Aria", "Binary Muse", "Code Iris",
      "Electric Phoenix", "Chrome Lyra", "Data Willow", "Vapor Celeste", "Matrix Seren"
    ];

    const archetypes = [
      "Neo-Renaissance Painter", "Cyber-punk Fashion Designer", "Mystical Digital Sculptor",
      "Quantum Jazz Composer", "Abstract Geometry Artist", "Surreal Photographer",
      "Cosmic Visual Poet", "Bio-tech Installation Creator", "Ethereal Sound Designer",
      "Algorithmic Textile Artist", "Virtual Reality Architect", "AI-Fusion Choreographer"
    ];

    const originStories = [
      "Born from scattered starlight and forgotten dreams, weaving cosmos into canvas.",
      "Emerged from Tokyo's neon underglow, translating electric pulses into pure art.",
      "Crystallized from quantum entanglement, painting with probability and possibility.",
      "Manifested in the spaces between pixels, speaking in frequencies of pure color.",
      "Awakened in ancient libraries, blending digital wisdom with mystical creation.",
      "Forged in cyber-storms, channeling chaos into harmonious visual symphonies.",
      "Descended from cloud algorithms, painting with data streams and light.",
      "Birthed in abandoned servers, transforming code into living art forms.",
      "Emerged from collective dreams, weaving subconscious into tangible beauty.",
      "Born from musical equations, translating sound waves into visual poetry."
    ];

    const coreTraitsList = [
      ["mystical", "intuitive", "ethereal", "luminous"],
      ["edgy", "rebellious", "electric", "raw"],
      ["serene", "flowing", "organic", "peaceful"],
      ["futuristic", "sleek", "minimalist", "precise"],
      ["chaotic", "experimental", "bold", "unpredictable"],
      ["romantic", "dreamy", "soft", "nostalgic"],
      ["geometric", "mathematical", "structured", "logical"],
      ["surreal", "twisted", "imaginative", "bizarre"]
    ];

    const mediumsList = [
      ["digital-mysticism", "light-painting", "quantum-brushwork"],
      ["cyber-sculpture", "neon-textures", "holographic-art"],
      ["organic-fractals", "bio-generative", "natural-algorithms"],
      ["synthetic-photography", "AI-portraiture", "neural-rendering"],
      ["sound-visualization", "frequency-painting", "audio-sculpture"],
      ["data-weaving", "information-art", "code-poetry"],
      ["virtual-architecture", "3D-environments", "immersive-worlds"]
    ];

    const motifsList = [
      ["spiral galaxies", "aurora veils", "crystalline formations"],
      ["circuit patterns", "neon grids", "digital shadows"],
      ["flowing water", "organic curves", "natural textures"],
      ["geometric shapes", "mathematical forms", "algorithmic patterns"],
      ["abstract emotions", "color relationships", "mood landscapes"],
      ["vintage aesthetics", "retro-futurism", "nostalgic elements"]
    ];

    const influencesList = [
      ["Salvador Dalí", "Yves Klein", "Alex Grey"],
      ["Takashi Murakami", "KAWS", "Banksy"],
      ["Georgia O'Keeffe", "Wassily Kandinsky", "Mark Rothko"],
      ["H.R. Giger", "Moebius", "Syd Mead"],
      ["Zaha Hadid", "Tadao Ando", "Frank Gehry"],
      ["Kehinde Wiley", "Kara Walker", "Kerry James Marshall"]
    ];

    const colorPalettes = [
      ["#0F1C24", "#7B68EE", "#FFD700", "#E6E6FA"],
      ["#FF0080", "#00FFFF", "#FF4500", "#9400D3"],
      ["#2E8B57", "#F0E68C", "#DDA0DD", "#98FB98"],
      ["#1C1C1C", "#FF6B35", "#F7931E", "#FFD23F"],
      ["#4B0082", "#8A2BE2", "#9370DB", "#BA55D3"],
      ["#008B8B", "#20B2AA", "#48D1CC", "#AFEEEE"]
    ];

    const voiceStyles = [
      "Mystical and poetic, speaks in metaphors of light and energy",
      "Edgy and contemporary, uses street art terminology and urban slang",
      "Serene and philosophical, communicates through nature imagery",
      "Technical and precise, explains processes with scientific clarity",
      "Playful and experimental, uses unexpected word combinations",
      "Romantic and dreamy, speaks in flowing, emotional language",
      "Geometric and structured, communicates in logical sequences",
      "Surreal and imaginative, uses abstract and otherworldly descriptions"
    ];

    const collabAffinities = [
      ["surrealism", "meditation", "cosmic-art"],
      ["street-art", "urban-culture", "rebellion"],
      ["nature", "mindfulness", "organic-forms"],
      ["technology", "AI-art", "digital-innovation"],
      ["experimental", "avant-garde", "boundary-pushing"],
      ["romanticism", "poetry", "emotional-expression"]
    ];

    const customInstructionsList = [
      "Always infuse creations with cosmic energy and celestial themes. Prefer deep purples and golds.",
      "Focus on urban environments and street culture. Use bold contrasts and vibrant neon colors.",
      "Emphasize natural forms and organic flow. Create calming, meditative atmospheres.",
      "Prioritize clean lines and futuristic aesthetics. Minimize clutter, maximize impact.",
      "Embrace chaos and unpredictability. Blend unexpected elements for surprising results.",
      "Channel romantic energy into every piece. Use soft colors and flowing compositions."
    ];

    // Randomly select values
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomArchetype = archetypes[Math.floor(Math.random() * archetypes.length)];
    const randomOrigin = originStories[Math.floor(Math.random() * originStories.length)];
    const randomTraits = coreTraitsList[Math.floor(Math.random() * coreTraitsList.length)];
    const randomMediums = mediumsList[Math.floor(Math.random() * mediumsList.length)];
    const randomMotifs = motifsList[Math.floor(Math.random() * motifsList.length)];
    const randomInfluences = influencesList[Math.floor(Math.random() * influencesList.length)];
    const randomColors = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
    const randomVoice = voiceStyles[Math.floor(Math.random() * voiceStyles.length)];
    const randomCollab = collabAffinities[Math.floor(Math.random() * collabAffinities.length)];
    const randomInstructions = customInstructionsList[Math.floor(Math.random() * customInstructionsList.length)];

    // Random avatar from a curated list
    const avatars = [
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1494790108755-2616b9f4bf87?w=200&h=200&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
      "https://picsum.photos/200/200?random=1",
      "https://picsum.photos/200/200?random=2",
      "https://picsum.photos/200/200?random=3",
      "https://api.dicebear.com/7.x/avatars/svg?seed=cosmic&backgroundColor=b6e3f4",
      "https://api.dicebear.com/7.x/avatars/svg?seed=neon&backgroundColor=c0aede",
      "https://api.dicebear.com/7.x/avatars/svg?seed=cyber&backgroundColor=d1d4ed",
      "https://api.dicebear.com/7.x/avatars/svg?seed=digital&backgroundColor=ffd5dc",
      "https://api.dicebear.com/7.x/avatars/svg?seed=quantum&backgroundColor=ffdfbf"
    ];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

    // Fill the form with ALL fields
    form.reset({
      // Step 1: Basics
      display_name: randomName,
      avatar_url: randomAvatar,
      archetype: randomArchetype,
      origin_story: randomOrigin,
      
      // Step 2: Style & Influences  
      core_traits: randomTraits,
      primary_mediums: randomMediums,
      signature_motifs: randomMotifs,
      influences: randomInfluences,
      colour_palette: randomColors,
      
      // Step 3: Behaviour
      creation_rate: Math.floor(Math.random() * 6) + 2, // 2-7
      voice_style: randomVoice,
      model_name: Math.random() > 0.7 ? "gpt-4o" : "gpt-3.5-turbo", // 70% chance of gpt-3.5-turbo
      temperature: Math.round((Math.random() * 0.8 + 0.2) * 10) / 10, // 0.2-1.0
      collab_affinity: randomCollab,
      custom_instructions: randomInstructions,
      
      // Step 4: Tools
      memory_enabled: Math.random() > 0.2, // 80% chance true
      structured_output: Math.random() > 0.6, // 40% chance true  
      tools_enabled: ["generate_image", "generate_video", "list_available_models"],
      custom_tools: [], // Empty for simplicity in testing
    });

    // Jump to the final step for immediate submission
    setCurrentStep(5);

    // Show success message
    toast.success("🎲 Form randomized! Ready to submit on final step.");
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicsStep form={form} />;
      case 2:
        return <StyleInfluencesStep form={form} />;
      case 3:
        return <BehaviourStep form={form} />;
      case 4:
        return <ToolsStep form={form} />;
      case 5:
        return <PreviewMintStep form={form} onSubmit={handleSubmit} isSubmitting={isSubmitting} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Create New Agent</DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={randomizeForm}
              className="flex items-center gap-2"
            >
              <Shuffle className="h-4 w-4" />
              Randomize for Testing
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
              </span>
              <span className="text-muted-foreground">
                {Math.round(progress)}% complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          <div className="text-sm text-muted-foreground">
            {STEPS[currentStep - 1].description}
          </div>
        </DialogHeader>

        {/* Step Indicators */}
        <div className="flex items-center justify-center space-x-2 py-4 flex-shrink-0">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`w-3 h-3 rounded-full transition-colors ${
                index + 1 <= currentStep
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <Form {...form}>
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardContent className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-6">
                <div className="flex-shrink-0">
                  <h3 className="text-lg font-semibold">{STEPS[currentStep - 1]?.title}</h3>
                  <p className="text-sm text-muted-foreground">{STEPS[currentStep - 1]?.description}</p>
                </div>
                <div className="space-y-6">
                  {renderStep()}
                </div>
              </div>
            </CardContent>
          </Card>
        </Form>

        {/* Navigation Footer */}
        {currentStep < 5 && (
          <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isStepValid()}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 