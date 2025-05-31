"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Slider } from "@/components/ui/slider";
import { useAgents } from "@/lib/stores/use-agents";
import { type Agent } from "@/lib/stubs";

const listAgentSchema = z.object({
  price: z.number().min(1, { message: "Minimum price is 1 token" }),
});

type ListAgentValues = z.infer<typeof listAgentSchema>;

interface ListAgentModalProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ListAgentModal({ agent, open, onOpenChange }: ListAgentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { listAgent, delistAgent } = useAgents();
  
  const form = useForm<ListAgentValues>({
    resolver: zodResolver(listAgentSchema),
    defaultValues: {
      price: 100,
    },
  });
  
  const onSubmit = async (data: ListAgentValues) => {
    if (!agent) return;
    
    setIsSubmitting(true);
    
    try {
      await listAgent(agent.id, data.price);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error listing agent:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelist = async () => {
    if (!agent) return;
    
    setIsSubmitting(true);
    
    try {
      await delistAgent(agent.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Error delisting agent:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!agent) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Trade Agent</DialogTitle>
          <DialogDescription>
            List your agent for sale or remove it from the marketplace.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Listing Price (tokens)</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      <Slider
                        value={[field.value]}
                        min={1}
                        max={10000}
                        step={1}
                        onValueChange={(value) => field.onChange(value[0])}
                      />
                      <div className="flex items-center justify-between text-sm">
                        <span>1 token</span>
                        <span>{field.value} tokens</span>
                        <span>10,000 tokens</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Set a competitive price based on your agent&apos;s capabilities
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDelist}
                disabled={isSubmitting}
              >
                Delist Agent
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    List for Sale
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