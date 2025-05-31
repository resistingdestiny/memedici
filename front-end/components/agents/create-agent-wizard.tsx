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
import { ChevronLeft, ChevronRight } from "lucide-react";
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
    endpoint: z.string().url()
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
          ...data,
          agent_type: "creative_artist",
          prompt_formula: null, // Will be auto-generated by backend
        }
      };

      // Call the real Memedici API
      await createAgent(payload);
      
      // Clear draft
      localStorage.removeItem("agentDraft");
      
      // Show success message
      toast.success("Agent minted successfully! 🎉");
      
      // Close modal and redirect to agent profile
      onOpenChange(false);
      router.push(`/agents/${agentId}`);
      
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
        toast.error("Something went wrong 🤔 Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl font-bold">Create Agent Wizard</DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.title}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

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