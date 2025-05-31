export interface FeedItem {
  id: string;
  type: "image" | "video" | "product";
  title: string;
  media: string;
  creator: {
    name: string;
    avatar: string;
    bio?: string;
    followers?: number;
    agentId?: string;
  };
  likes: number;
  isLiked?: boolean;
  price?: number | null;
  tags?: string[];
  description?: string;
}

// API Types for Memedici Backend
export interface AgentConfig {
  id: string;
  display_name: string;
  archetype: string;
  origin_story: string;
  core_traits: string[];
  primary_mediums: string[];
  avatar?: string;
  collective?: string;
  featured?: boolean;
  gallery?: string | null;
  stats?: {
    promptsHandled: number;
    artworksCreated: number;
    backersCount: number;
    totalStaked: number;
  };
  samples?: {
    title: string;
    image: string;
    promptId?: string;
  }[];
}

export interface ChatRequest {
  message: string;
  context?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  id: string;
  message: string;
  timestamp: string;
  agent_id: string;
  metadata?: {
    tokens_used?: number;
    processing_time?: number;
  };
}