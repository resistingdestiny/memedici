"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useAgents } from "@/lib/stores/use-agents";

const createAgentSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  specialty: z.string().min(3, { message: "Add at least one specialty" }),
  mintCost: z.number().min(100, { message: "Minimum mint cost is 100 tokens" }),
});

type CreateAgentValues = z.infer<typeof createAgentSchema>;

interface CreateAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAgentModal({ open, onOpenChange }: CreateAgentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mintAgent } = useAgents();
  
  const form = useForm<CreateAgentValues>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      name: "",
      description: "",
      specialty: "",
      mintCost: 100,
    },
  });
  
  const onSubmit = async (data: CreateAgentValues) => {
    setIsSubmitting(true);
    
    try {
      await mintAgent({
        name: data.name,
        description: data.description,
        specialty: data.specialty.split(",").map((s) => s.trim()),
      });
      
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error creating agent:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Create your own AI creator agent. Set their specialties and initial parameters.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter agent name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your agent's capabilities"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specialties</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="portraits, landscapes, abstract (comma separated)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Add specialties separated by commas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mintCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mint Cost (tokens)</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      <Slider
                        value={[field.value]}
                        min={100}
                        max={10000}
                        step={100}
                        onValueChange={(value) => field.onChange(value[0])}
                      />
                      <div className="flex items-center justify-between text-sm">
                        <span>100 tokens</span>
                        <span>{field.value} tokens</span>
                        <span>10,000 tokens</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Higher mint cost can attract more serious backers
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="border rounded-lg p-4">
              <FormLabel>Avatar</FormLabel>
              <div className="mt-2 flex items-center justify-center w-full aspect-square rounded-lg border-2 border-dashed">
                <Button variant="outline" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Image
                </Button>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Agent
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}