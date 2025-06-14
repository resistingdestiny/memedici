"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Upload, 
  FileText, 
  Code, 
  Key, 
  HelpCircle,
  AlertTriangle,
  CheckCircle,
  X,
  Wand2
} from "lucide-react";
import { createTool, createCustomTool, uploadToolSpec } from "@/lib/api";

interface CreateToolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ToolData {
  name: string;
  description: string;
  category: string;
  api_config?: {
    endpoint: string;
    method: string;
    content_type: string;
    auth?: {
      type: string;
      value: string;
    };
    request_schema?: any;
    response_format: string;
    response_example?: string;
  };
}

export function CreateToolModal({ open, onOpenChange, onSuccess }: CreateToolModalProps) {
  const [currentTab, setCurrentTab] = useState("manual");
  const [isCreating, setIsCreating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form data
  const [formData, setFormData] = useState<ToolData>({
    name: "",
    description: "",
    category: "utility",
    api_config: {
      endpoint: "",
      method: "POST",
      content_type: "application/json",
      response_format: "json",
    }
  });
  
  const [specContent, setSpecContent] = useState("");
  const [authType, setAuthType] = useState("none");

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "utility",
      api_config: {
        endpoint: "",
        method: "POST",
        content_type: "application/json",
        response_format: "json",
      }
    });
    setSpecContent("");
    setAuthType("none");
    setUploadedFile(null);
    setCurrentTab("manual");
  };

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        setSpecContent(content);
        
        // Try to parse and auto-populate fields
        let parsedContent;
        if (file.name.endsWith('.json')) {
          parsedContent = JSON.parse(content);
        } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
          // Basic YAML parsing - in production, use a proper YAML library
          parsedContent = parseBasicYAML(content);
        }
        
        if (parsedContent) {
          autoPopulateFromSpec(parsedContent);
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        setSpecContent(`Error parsing file: ${error}`);
      }
    };
    
    reader.readAsText(file);
  };

  const parseBasicYAML = (yamlText: string) => {
    // Very basic YAML parser - for production, use js-yaml
    const lines = yamlText.split('\n');
    const result: any = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split(':');
        if (valueParts.length > 0) {
          const value = valueParts.join(':').trim();
          result[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
    }
    
    return result;
  };

  const autoPopulateFromSpec = (spec: any) => {
    const newFormData = { ...formData };
    
    // Auto-populate from OpenAPI/Swagger spec
    if (spec.info) {
      if (spec.info.title) {
        newFormData.name = spec.info.title.toLowerCase().replace(/\s+/g, '_');
      }
      if (spec.info.description) {
        newFormData.description = spec.info.description;
      }
    }
    
    // Extract first endpoint
    if (spec.paths && spec.servers?.[0]) {
      const firstPath = Object.keys(spec.paths)[0];
      if (firstPath) {
        newFormData.api_config!.endpoint = spec.servers[0].url + firstPath;
        
        // Extract HTTP method
        const pathData = spec.paths[firstPath];
        const methods = Object.keys(pathData);
        if (methods.length > 0) {
          newFormData.api_config!.method = methods[0].toUpperCase();
        }
      }
    }
    
    setFormData(newFormData);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
      let toolData;
      
      if (currentTab === "upload" && uploadedFile) {
        // Use the upload endpoint for file uploads
        await uploadToolSpec(uploadedFile);
      } else {
        // Use the CustomToolRequest format for manual entry
        toolData = {
          tool_name: formData.name,  // API expects tool_name, not name
          description: formData.description,
          api_endpoint: formData.api_config?.endpoint || null,  // API expects api_endpoint, not nested config
          response_format: formData.api_config?.response_format || "json"
        };
        
        // Parse and add request schema as parameters if provided
        const requestSchemaInput = document.getElementById('requestSchema') as HTMLTextAreaElement;
        if (requestSchemaInput?.value.trim()) {
          try {
            toolData.parameters = JSON.parse(requestSchemaInput.value);
          } catch (e) {
            throw new Error('Invalid JSON in request schema');
          }
        } else {
          toolData.parameters = {};  // Default empty object
        }
        
        // Use the createCustomTool function which matches the API spec
        await createCustomTool(toolData);
      }
      
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating tool:', error);
      alert(error.message || 'Failed to create tool. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Randomize function for testing
  const randomizeToolForm = () => {
    // Predefined lists for random selection
    const toolNames = [
      "neural_style_transfer",
      "quantum_color_generator", 
      "ai_composition_analyzer",
      "semantic_image_search",
      "creative_prompt_enhancer",
      "digital_texture_synthesizer",
      "emotion_palette_mapper",
      "trend_prediction_engine",
      "artistic_similarity_finder",
      "mood_based_filter"
    ];

    const categories = [
      "art_creation",
      "analysis", 
      "enhancement",
      "utility",
      "blockchain"
    ];

    const descriptions = [
      "Transforms images using advanced neural style transfer techniques to apply artistic styles from master paintings",
      "Generates harmonious color palettes using quantum computing principles for unprecedented color combinations",
      "Analyzes visual composition using AI to provide detailed feedback on balance, rhythm, and visual flow",
      "Searches through vast image databases using semantic understanding rather than simple keyword matching",
      "Enhances creative prompts by expanding on themes, adding contextual details, and suggesting artistic techniques",
      "Synthesizes realistic digital textures from simple parameters for use in 3D modeling and digital art",
      "Maps human emotions to color palettes based on psychological color theory and machine learning",
      "Predicts upcoming art trends by analyzing social media, gallery exhibitions, and market data",
      "Finds artworks with similar compositional elements, color schemes, or emotional resonance",
      "Applies mood-based filters that adjust lighting, color temperature, and atmosphere dynamically"
    ];

    const endpoints = [
      "https://api.neuralstyle.ai/v2/transfer",
      "https://quantumcolor.io/api/v1/generate",
      "https://compositionai.com/analyze/v3",
      "https://semanticsearch.art/api/find",
      "https://promptenhancer.io/v1/enhance",
      "https://texturesynth.com/api/generate",
      "https://emotionpalette.ai/v2/map",
      "https://trendpredict.art/api/v1/forecast",
      "https://similarity.gallery/api/search",
      "https://moodfilter.io/v1/apply"
    ];

    const methods = ["GET", "POST", "PUT"];
    const contentTypes = ["application/json", "application/x-www-form-urlencoded", "multipart/form-data"];
    const responseFormats = ["json", "text", "image", "binary"];

    const sampleSchemas = [
      `{
  "type": "object",
  "properties": {
    "input_image": {
      "type": "string",
      "description": "Base64 encoded image or URL"
    },
    "style": {
      "type": "string",
      "enum": ["impressionist", "cubist", "abstract", "photorealistic"],
      "description": "Artistic style to apply"
    },
    "intensity": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Style transfer intensity"
    }
  },
  "required": ["input_image", "style"]
}`,
      `{
  "type": "object", 
  "properties": {
    "prompt": {
      "type": "string",
      "description": "Creative prompt to enhance"
    },
    "style_preference": {
      "type": "string",
      "enum": ["classical", "modern", "surreal", "minimalist"]
    },
    "complexity": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10
    }
  },
  "required": ["prompt"]
}`,
      `{
  "type": "object",
  "properties": {
    "color_count": {
      "type": "integer",
      "minimum": 3,
      "maximum": 12,
      "description": "Number of colors in palette"
    },
    "mood": {
      "type": "string",
      "enum": ["calm", "energetic", "mysterious", "warm", "cool"]
    },
    "format": {
      "type": "string",
      "enum": ["hex", "rgb", "hsl"]
    }
  },
  "required": ["color_count"]
}`
    ];

    const responseExamples = [
      `{
  "status": "success",
  "result_url": "https://cdn.example.com/stylized_image.jpg",
  "processing_time": 2.4,
  "style_applied": "impressionist"
}`,
      `{
  "enhanced_prompt": "A serene landscape painting featuring rolling hills under a golden sunset, painted in the impressionist style with visible brushstrokes and warm color palette",
  "suggested_techniques": ["alla prima", "color blocking", "atmospheric perspective"],
  "mood": "peaceful",
  "complexity_score": 7
}`,
      `{
  "palette": [
    {"hex": "#FF6B6B", "name": "Coral Pink"},
    {"hex": "#4ECDC4", "name": "Turquoise"},
    {"hex": "#45B7D1", "name": "Sky Blue"},
    {"hex": "#96CEB4", "name": "Mint Green"},
    {"hex": "#FFEAA7", "name": "Vanilla"}
  ],
  "harmony_type": "analogous",
  "mood_match": 0.87
}`
    ];

    // Randomly select values
    const randomName = toolNames[Math.floor(Math.random() * toolNames.length)];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
    const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const randomMethod = methods[Math.floor(Math.random() * methods.length)];
    const randomContentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
    const randomResponseFormat = responseFormats[Math.floor(Math.random() * responseFormats.length)];
    const randomSchema = sampleSchemas[Math.floor(Math.random() * sampleSchemas.length)];
    const randomResponseExample = responseExamples[Math.floor(Math.random() * responseExamples.length)];

    // Set randomized form data
    setFormData({
      name: randomName,
      description: randomDescription,
      category: randomCategory,
      api_config: {
        endpoint: randomEndpoint,
        method: randomMethod,
        content_type: randomContentType,
        response_format: randomResponseFormat,
        response_example: randomResponseExample
      }
    });

    // Set auth type randomly
    const authTypes = ["none", "bearer", "api_key", "basic"];
    const randomAuthType = authTypes[Math.floor(Math.random() * authTypes.length)];
    setAuthType(randomAuthType);

    // Populate schema text area
    const requestSchemaInput = document.getElementById('requestSchema') as HTMLTextAreaElement;
    if (requestSchemaInput) {
      requestSchemaInput.value = randomSchema;
    }

    // Populate response example text area  
    const responseExampleInput = document.getElementById('responseExample') as HTMLTextAreaElement;
    if (responseExampleInput) {
      responseExampleInput.value = randomResponseExample;
    }

    console.log("🎲 Tool form randomized for testing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔧 Create Custom Tool
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Manual Entry
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Spec
              </TabsTrigger>
            </TabsList>

            {/* Manual Entry Tab */}
            <TabsContent value="manual" className="space-y-6">
              {/* Tool Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    🔧 Tool Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="toolName">Tool Name *</Label>
                      <Input
                        id="toolName"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g., generate_color_palette"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(value) => setFormData({...formData, category: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="art_creation">Art Creation</SelectItem>
                          <SelectItem value="analysis">Analysis</SelectItem>
                          <SelectItem value="enhancement">Enhancement</SelectItem>
                          <SelectItem value="blockchain">Blockchain</SelectItem>
                          <SelectItem value="utility">Utility</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Describe what this tool does and how it helps with creative work..."
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* API Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    🌐 API Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="endpoint">API Endpoint URL (Optional)</Label>
                    <Input
                      id="endpoint"
                      type="url"
                      value={formData.api_config?.endpoint || ""}
                      onChange={(e) => setFormData({
                        ...formData, 
                        api_config: {...formData.api_config!, endpoint: e.target.value}
                      })}
                      placeholder="https://api.example.com/v1/generate"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty for purely internal or prompt-only tools
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="method">HTTP Method</Label>
                      <Select 
                        value={formData.api_config?.method} 
                        onValueChange={(value) => setFormData({
                          ...formData, 
                          api_config: {...formData.api_config!, method: value}
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="contentType">Content Type</Label>
                      <Select 
                        value={formData.api_config?.content_type} 
                        onValueChange={(value) => setFormData({
                          ...formData, 
                          api_config: {...formData.api_config!, content_type: value}
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="application/json">application/json</SelectItem>
                          <SelectItem value="application/x-www-form-urlencoded">form-urlencoded</SelectItem>
                          <SelectItem value="multipart/form-data">multipart/form-data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="responseFormat">Response Format</Label>
                      <Select 
                        value={formData.api_config?.response_format} 
                        onValueChange={(value) => setFormData({
                          ...formData, 
                          api_config: {...formData.api_config!, response_format: value}
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="text">Plain Text</SelectItem>
                          <SelectItem value="image">Image URL</SelectItem>
                          <SelectItem value="binary">Binary Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Authentication */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    🔑 Authentication (Optional)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="authType">Authentication Type</Label>
                    <Select value={authType} onValueChange={setAuthType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {authType !== "none" && (
                    <div>
                      <Label htmlFor="authValue">Authentication Value</Label>
                      <Input
                        id="authValue"
                        type="password"
                        placeholder={
                          authType === "bearer" ? "Bearer token" :
                          authType === "api_key" ? "API key" :
                          "Username:Password"
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This will be stored securely and used for API calls
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Parameters & Schema */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    📝 Parameters & Schema
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="requestSchema">Request Parameters (JSON Schema)</Label>
                    <Textarea
                      id="requestSchema"
                      className="font-mono text-sm"
                      rows={8}
                      placeholder={`{
  "type": "object",
  "properties": {
    "prompt": {
      "type": "string", 
      "description": "Creative prompt for generation"
    },
    "style": {
      "type": "string",
      "enum": ["abstract", "realistic", "minimalist"],
      "description": "Art style to apply"
    }
  },
  "required": ["prompt"]
}`}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="responseExample">Response Example</Label>
                    <Textarea
                      id="responseExample"
                      className="font-mono text-sm"
                      rows={4}
                      placeholder="Example of successful API response..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Upload Spec Tab */}
            <TabsContent value="upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    📁 Upload API Specification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragOver 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.yaml,.yml"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      className="hidden"
                    />
                    
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                      
                      {uploadedFile ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="font-medium">{uploadedFile.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            File uploaded successfully. Preview below.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-lg font-medium">Click to upload or drag & drop</p>
                          <p className="text-sm text-muted-foreground">
                            Supports OpenAPI, Swagger, or custom JSON/YAML specs
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {specContent && (
                    <div className="mt-6">
                      <Label htmlFor="specPreview">Specification Preview</Label>
                      <Textarea
                        id="specPreview"
                        value={specContent}
                        onChange={(e) => setSpecContent(e.target.value)}
                        className="font-mono text-sm mt-2"
                        rows={10}
                        placeholder="Upload a file to see preview or paste your API specification here..."
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Basic Tool Info for Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tool Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="uploadToolName">Tool Name (Optional)</Label>
                    <Input
                      id="uploadToolName"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Will be extracted from spec if not provided"
                    />
                  </div>
                  <div>
                    <Label htmlFor="uploadDescription">Description (Optional)</Label>
                    <Textarea
                      id="uploadDescription"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Will be extracted from spec if not provided"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              variant="secondary"
              onClick={randomizeToolForm}
              disabled={isCreating}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Randomize
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Creating...
                </>
              ) : (
                'Create Tool'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 