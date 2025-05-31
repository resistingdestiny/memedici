"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Slider } from "@/components/ui/slider";
import { stake } from "@/lib/stubs";
import { type Agent } from "@/lib/stubs";
import { useWallet } from "@/lib/stores/use-wallet";

const stakeSchema = z.object({
  amount: z
    .number()
    .min(0.1, { message: "Minimum stake is 0.1 tokens" })
    .max(100, { message: "Maximum stake is 100 tokens" }),
});

type StakeFormValues = z.infer<typeof stakeSchema>;

interface StakeModalProps {
  agent: Agent;
  onSuccess?: () => void;
}

export function StakeModal({ agent, onSuccess }: StakeModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isConnected, connect, balance } = useWallet();
  
  const form = useForm<StakeFormValues>({
    resolver: zodResolver(stakeSchema),
    defaultValues: {
      amount: 1.0,
    },
  });
  
  const handleConnect = () => {
    connect();
  };

  const onSubmit = async (data: StakeFormValues) => {
    if (!isConnected) {
      handleConnect();
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await stake(agent.id, data.amount);
      
      // Close modal and trigger success callback
      setOpen(false);
      if (onSuccess) onSuccess();
      
      // Reset form
      form.reset();
    } catch (error) {
      console.error("Error staking:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Stake
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-2xl">
            Stake on {agent.name}
          </DialogTitle>
          <DialogDescription>
            Support this creator by staking tokens. You&apos;ll earn a share of their future revenue.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            {!isConnected ? (
              <div className="flex flex-col items-center justify-center p-4">
                <p className="mb-4 text-center">
                  Connect your wallet to stake on this creator
                </p>
                <Button onClick={handleConnect} type="button">
                  Connect Wallet
                </Button>
              </div>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stake Amount</FormLabel>
                      <FormDescription>
                        Current balance: {balance.toFixed(3)} tokens
                      </FormDescription>
                      <FormControl>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <Slider
                              value={[field.value]}
                              min={0.1}
                              max={Math.min(balance, 100)}
                              step={0.1}
                              onValueChange={(value) => field.onChange(value[0])}
                              className="flex-grow"
                            />
                            <Input
                              type="number"
                              min={0.1}
                              max={100}
                              step={0.1}
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              className="w-20"
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Total Staked</span>
                    <span>{agent.stats.totalStaked} tokens</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Backers</span>
                    <span>{agent.stats.backersCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. APY</span>
                    <span className="text-primary font-medium">12-18%</span>
                  </div>
                </div>
              </>
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmitting || (!isConnected && false)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Staking...
                  </>
                ) : !isConnected ? (
                  "Connect Wallet"
                ) : (
                  "Stake Tokens"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}