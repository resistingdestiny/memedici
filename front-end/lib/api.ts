import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://memedici-backend.onrender.com',
  headers: { 'Content-Type': 'application/json' }
});

// Types
export interface CreateAgentRequest {
  agent_id: string;
  config: AgentConfig;
}

export interface AgentConfig {
  display_name: string;
  avatar_url?: string;
  archetype: string;
  origin_story: string;
  core_traits: string[];
  primary_mediums: string[];
  signature_motifs: string[];
  influences: string[];
  colour_palette: string[];
  creation_rate: number;
  voice_style: string;
  model_name: "gpt-3.5-turbo" | "gpt-4o";
  temperature: number;
  collab_affinity: string[];
  custom_instructions: string;
  memory_enabled: boolean;
  structured_output: boolean;
  tools_enabled: string[];
  custom_tools: Array<{
    name: string;
    description: string;
    endpoint: string;
  }>;
  agent_type: string;
  prompt_formula?: string | null;
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

// API Functions
export async function createAgent(data: CreateAgentRequest) {
  const res = await api.post('/agents', data);
  return res.data;
}

export async function getAgent(id: string) {
  const res = await api.get(`/agents/${id}`);
  return res.data;
}

export async function getAgents() {
  const res = await api.get('/agents');
  return res.data;
}

export async function chatWithAgent(agentId: string, message: string) {
  const res = await api.post('/chat', { agent_id: agentId, message });
  return res.data;
}

export async function evolveAgent(agentId: string, interactionType: string, outcome: string) {
  const res = await api.post(`/agents/${agentId}/evolve`, { 
    interaction_type: interactionType, 
    outcome 
  });
  return res.data;
}

export async function resetAgentMemory(agentId: string, threadId: string = 'default') {
  const res = await api.delete(`/agents/${agentId}/memory?thread_id=${threadId}`);
  return res.data;
} 