import axios from 'axios';

// Enhanced API client with better error handling and fallback
export const api = axios.create({
  baseURL: process.env.NODE_ENV === 'development' 
    ? '/api' // Use Next.js proxy in development
    : 'https://memedici-backend.onrender.com',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 second timeout for long-running operations
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.response?.status === 503) {
      console.warn('Service temporarily unavailable - backend may be starting up');
    }
    return Promise.reject(error);
  }
);

// Types from OpenAPI spec
export interface ChatRequest {
  message: string;
  agent_id?: string;
  thread_id?: string;
}

export interface ChatResponse {
  success: boolean;
  response?: string;
  error?: string;
  agent_id: string;
  thread_id: string;
  tools_used?: string[];
  persona_evolved?: boolean;
  assets?: Record<string, any>; // For generated images/videos
}

export interface CreateAgentRequest {
  agent_id: string;
  config: AgentConfig;
}

export interface AgentConfig {
  // Core Identity Fields
  id: string;
  display_name: string;
  avatar_url?: string | null;
  archetype: string;
  core_traits: string[];
  origin_story: string;
  primary_mediums: string[];
  signature_motifs: string[];
  influences: string[];
  colour_palette: string[];
  prompt_formula?: string | null;
  voice_style?: string | null;
  creation_rate: number;
  collab_affinity: string[];
  
  // Studio ID - REQUIRED FIELD
  studio_id?: string | null;
  
  // Technical Configuration
  agent_type: string;
  model_name: string;
  temperature: number;
  max_tokens?: number | null;
  memory_enabled: boolean;
  structured_output: boolean;
  
  // Studio fields
  studio_name: string;
  studio_description: string;
  studio_theme: string;
  art_style: string;
  studio_items: StudioItem[];
  
  // Tools
  tools_enabled: string[];
  custom_tools: Array<{
    name: string;
    description: string;
    api_config?: any;
  }>;
  
  // Custom instructions
  custom_instructions?: string | null;
  
  // Legacy persona fields (for compatibility)
  persona_name: string;
  persona_background: string;
  personality_traits: string[];
  artistic_influences: string[];
  preferred_mediums: string[];
  
  // Evolution fields
  interaction_count: number;
  artworks_created: number;
  persona_evolution_history: Array<any>;
}

export interface StudioItem {
  name: string;
  category: string;
  description: string;
  rarity: string;
  specifications?: Record<string, any>;
  condition?: string;
  acquisition_date?: string | null;
  cost?: number | null;
  notes?: string | null;
}

export interface StudioData {
  name: string;
  description: string;
  theme: string;
  art_style: string;
  items_count: number;
  featured_items: StudioItem[];
}

export interface Studio {
  studio_id: string;
  studio: StudioData;
  assigned_agents: string[];
  agent_count: number;
}

// Legacy interface for compatibility
export interface LegacyStudio {
  id: string;
  name: string;
  description?: string;
  theme?: string;
  art_style?: string;
  studio_items?: StudioItem[];
}

export interface PersonaEvolutionRequest {
  agent_id: string;
  interaction_type: string;
  outcome: string;
}

export interface CustomToolRequest {
  tool_name: string;
  description: string;
  api_endpoint?: string | null;
  parameters?: Record<string, any>;
  response_format?: string;
}

// Agent representation for frontend
export interface Agent {
  id: string;
  agent_id: string;
  identity?: {
    display_name: string;
    avatar_url?: string;
    archetype: string;
  };
  studio?: {
    name: string;
    description: string;
    theme: string;
    art_style: string;
  };
  creative_specs?: {
    primary_mediums: string[];
    signature_motifs: string[];
    influences: string[];
  };
  evolution?: {
    interaction_count: number;
    artworks_created: number;
  };
  // Legacy fields for backward compatibility
  name: string;
  description: string;
  specialty: string[];
  collective: string;
  avatar: string;
  featured: boolean;
  gallery: string | null;
  stats: {
    promptsHandled: number;
    artworksCreated: number;
    backersCount: number;
    totalStaked: number;
  };
  samples: Array<{
    title: string;
    image: string;
    promptId?: string;
  }>;
}

// Utility function to create slugs
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '') // Remove special characters
    .replace(/\s+/g, '_')        // Replace spaces with underscores
    .replace(/-+/g, '_')         // Replace dashes with underscores
    .replace(/_+/g, '_')         // Replace multiple underscores with single
    .replace(/^_|_$/g, '');      // Remove leading/trailing underscores
}

// Transform backend agent data to frontend format
export function transformAgentData(backendAgent: any): Agent {
  const identity = backendAgent.identity || {};
  const studio = backendAgent.studio || {};
  const creative = backendAgent.creative_specs || {};
  const evolution = backendAgent.evolution || {};
  const persona = backendAgent.persona || {}; // Legacy fallback
  
  // Convert relative avatar URLs to full URLs
  let avatarUrl = identity.avatar_url;
  if (avatarUrl && !avatarUrl.startsWith('http')) {
    // If it's a relative path, prepend the backend base URL
    avatarUrl = `https://memedici-backend.onrender.com/${avatarUrl}`;
  }
  if (!avatarUrl) {
    // Fallback to generated avatar
    avatarUrl = `https://api.dicebear.com/7.x/avatars/svg?seed=${backendAgent.agent_id}`;
  }
  
  return {
    id: backendAgent.agent_id,
    agent_id: backendAgent.agent_id,
    identity,
    studio,
    creative_specs: creative,
    evolution,
    // Legacy fields for backward compatibility
    name: identity.display_name || persona.name || backendAgent.agent_id,
    description: studio.description || persona.background || 'A creative AI agent',
    specialty: creative.primary_mediums || persona.preferred_mediums || ['digital art'],
    collective: studio.name || 'Independent',
    avatar: avatarUrl,
    featured: false, // This would come from backend if supported
    gallery: null, // This would come from backend if supported
    stats: {
      promptsHandled: evolution.interaction_count || 0,
      artworksCreated: evolution.artworks_created || 0,
      backersCount: 0, // Not in current backend
      totalStaked: 0, // Not in current backend
    },
    samples: [] // This would come from backend if supported
  };
}

// API Functions

// Health check
export async function checkHealth() {
  const res = await api.get('/health');
  return res.data;
}

// Chat endpoints
export async function chatWithAgent(agentId: string, message: string, threadId: string = 'default'): Promise<ChatResponse> {
  const res = await api.post('/chat', { 
    message, 
    agent_id: agentId, 
    thread_id: threadId 
  });
  return res.data;
}

// Agent management
export async function createAgent(data: CreateAgentRequest) {
  const res = await api.post('/agents', data);
  return res.data;
}

export async function getAgent(id: string) {
  const res = await api.get(`/agents/${id}`);
  return res.data;
}

export async function getAgents(): Promise<{ agents: any[] }> {
  const res = await api.get('/agents');
  return res.data;
}

export async function evolveAgentPersona(agentId: string, interactionType: string, outcome: string) {
  const res = await api.post(`/agents/${agentId}/evolve`, { 
    agent_id: agentId,
    interaction_type: interactionType, 
    outcome 
  });
  return res.data;
}

export async function resetAgentMemory(agentId: string, threadId: string = 'default') {
  const res = await api.delete(`/agents/${agentId}/memory?thread_id=${threadId}`);
  return res.data;
}

// Tools management
export async function getTools() {
  const res = await api.get('/tools');
  return res.data;
}

export async function createCustomTool(toolData: CustomToolRequest) {
  const res = await api.post('/tools', toolData);
  return res.data;
}

export async function createCustomToolV2(toolData: any) {
  const res = await api.post('/tools/custom', toolData);
  return res.data;
}

export async function executeCustomTool(toolId: string, parameters: Record<string, any>) {
  const res = await api.post(`/tools/${toolId}/execute`, parameters);
  return res.data;
}

export async function uploadToolSpec(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await api.post('/tools/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

// Studios
export async function getStudios() {
  const res = await api.get('/studios');
  return res.data;
}

export interface CreateStudioRequest {
  studio_id: string;
  studio: StudioData;
}

export async function createStudio(studioData: CreateStudioRequest) {
  const res = await api.post('/studios', studioData);
  return res.data;
}

export async function getStudio(studioId: string) {
  const res = await api.get(`/studios/${studioId}`);
  return res.data;
}

export async function assignAgentToStudio(agentId: string, studioId: string) {
  const res = await api.post(`/agents/${agentId}/assign-studio`, {
    agent_id: agentId,
    studio_id: studioId
  });
  return res.data;
}

// Test interface (for debugging)
export async function getTestInterface() {
  const res = await api.get('/test', {
    headers: {
      'Accept': 'text/html',
    },
  });
  return res.data;
}

// Tools API
export async function createTool(toolData: any) {
  const res = await api.post('/tools', toolData);
  return res.data;
}

export async function updateTool(toolId: string, toolData: any) {
  const res = await api.put(`/tools/${toolId}`, toolData);
  return res.data;
}

export async function deleteTool(toolId: string) {
  const res = await api.delete(`/tools/${toolId}`);
  return res.data;
}

// Artworks API
export interface ApiArtwork {
  id: string;
  artwork_type: string;
  prompt: string;
  model_name: string;
  model_type: string;
  file_url: string;
  file_size: number;
  created_at: string;
  full_prompt?: string;
  negative_prompt?: string;
  parameters?: any;
  metadata?: any;
}

export interface AgentArtworksResponse {
  success: boolean;
  error?: string;
  agent: {
    id: string;
    display_name: string;
    studio_name: string;
    art_style: string;
  };
  artworks: ApiArtwork[];
  statistics: {
    total_artworks: number;
    by_model_type: Record<string, number>;
    recent_activity: {
      last_7_days: number;
      last_30_days: number;
    };
  };
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
    total_pages: number;
  };
}

export interface AllArtworksResponse {
  success: boolean;
  error?: string;
  artworks: (ApiArtwork & {
    agent_id: string;
    agent_name: string;
    agent_info?: {
      display_name: string;
      studio_name: string;
      art_style: string;
      avatar_url?: string;
    };
  })[];
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
    total_pages: number;
    total_count: number;
  };
}

export async function getAllArtworks(
  limit: number = 20, 
  offset: number = 0, 
  includeDetails: boolean = false
): Promise<AllArtworksResponse> {
  const res = await api.get<AllArtworksResponse>(`/artworks/`, {
    params: {
      limit,
      offset,
      include_details: includeDetails
    }
  });
  return res.data;
}

export async function getAgentArtworks(
  agentId: string, 
  limit: number = 20, 
  offset: number = 0, 
  includeDetails: boolean = false
): Promise<AgentArtworksResponse> {
  const res = await api.get<AgentArtworksResponse>(`/artworks/agents/${agentId}`, {
    params: {
      limit,
      offset,
      include_details: includeDetails
    }
  });
  return res.data;
}

export async function getAgentRecentArtworks(agentId: string, days: number = 7) {
  const res = await api.get(`/artworks/agents/${agentId}/recent`, {
    params: { days }
  });
  return res.data;
}

export async function getArtwork(artworkId: string) {
  const res = await api.get(`/artworks/${artworkId}`);
  return res.data;
}