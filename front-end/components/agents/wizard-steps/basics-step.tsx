"use client";

import { UseFormReturn } from "react-hook-form";
import { Upload, User, Sparkles, BookOpen, X, ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
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
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const watchedOriginStory = form.watch("origin_story");
  const watchedAvatarUrl = form.watch("avatar_url");
  const wordCount = watchedOriginStory ? watchedOriginStory.split(" ").filter(word => word.length > 0).length : 0;
  const remainingWords = 40 - wordCount;

  const handleArchetypeSelect = (archetype: string) => {
    form.setValue("archetype", archetype);
  };

  // File validation
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Please upload an image file (JPG, PNG, GIF, WebP)';
    }
    
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return 'Image size must be less than 5MB';
    }
    
    return null;
  };

  const handleFileUpload = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setIsUploading(true);
    try {
      toast.info('Processing avatar...');
      
      // Convert to data URL (base64) for direct storage in form
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      form.setValue("avatar_url", dataUrl);
      toast.success('Avatar uploaded successfully!');
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process avatar. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const removeAvatar = () => {
    form.setValue("avatar_url", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

      {/* Avatar Upload */}
      <FormField
        control={form.control}
        name="avatar_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Avatar
            </FormLabel>
            <FormControl>
              <div className="space-y-4">
                {/* Avatar Preview or Upload Area */}
                <div 
                  className={`
                    relative flex items-center justify-center w-32 h-32 rounded-lg border-2 border-dashed 
                    transition-all duration-200 cursor-pointer
                    ${dragActive 
                      ? 'border-primary bg-primary/10' 
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }
                    ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={!isUploading ? handleAvatarUpload : undefined}
                >
                  {field.value ? (
                    <div className="relative w-full h-full group">
                      <img
                        src={field.value}
                        alt="Avatar preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAvatarUpload();
                            }}
                            disabled={isUploading}
                          >
                            <Upload className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAvatar();
                            }}
                            disabled={isUploading}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center p-4">
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <span className="text-sm text-muted-foreground">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Click or drag to upload
                          </span>
                          <span className="text-xs text-muted-foreground">
                            JPG, PNG, GIF (max 5MB)
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* URL Input Alternative */}
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Or enter image URL:</span>
                  <Input
                    placeholder="https://example.com/image.jpg or ipfs://..."
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isUploading}
                  />
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>
            </FormControl>
            <FormDescription>
              Upload an image or provide a URL. Supports IPFS links.
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
          <li>• Upload a high-quality avatar that represents your agent's style</li>
          <li>• Select an archetype that clearly defines the agent's creative niche</li>
          <li>• Keep the origin story concise but evocative - it sets the tone</li>
        </ul>
      </div>
    </div>
  );
} 