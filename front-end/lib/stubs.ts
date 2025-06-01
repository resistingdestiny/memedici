import { httpClient } from './http';
import { ChatRequest, ChatResponse } from './types';

export interface Agent {
  id: string;
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
  samples: {
    title: string;
    image: string;
    promptId?: string;
  }[];
}

export interface Artwork {
  id: string;
  title: string;
  description: string;
  image: string;
  agentId: string;
  promptId: string;
  creator: string;
  createdAt: string;
  price: number;
  sold: boolean;
}

export interface Prompt {
  id: string;
  text: string;
  agentId: string;
  userId: string;
  createdAt: string;
  status: 'pending' | 'completed' | 'failed';
  result?: {
    artworkId?: string;
    error?: string;
  };
}

export interface Room {
  id: string;
  name: string;
  walls: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }[];
  floor: {
    position: [number, number, number];
    scale: [number, number, number];
  };
  artworks: {
    id: string;
    title: string;
    image: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }[];
}

// Gallery data for static paths and 3D scenes
export const galleryData: Record<string, Room[]> = {
  "leonardo": [
    {
      id: "main-hall",
      name: "Main Hall",
      walls: [
        // Back wall
        {
          position: [0, 5, -10],
          rotation: [0, 0, 0],
          scale: [20, 10, 1]
        },
        // Front wall with entrance
        {
          position: [-7.5, 5, 10],
          rotation: [0, 0, 0],
          scale: [5, 10, 1]
        },
        {
          position: [7.5, 5, 10],
          rotation: [0, 0, 0],
          scale: [5, 10, 1]
        },
        // Left wall
        {
          position: [-10, 5, 0],
          rotation: [0, Math.PI / 2, 0],
          scale: [20, 10, 1]
        },
        // Right wall
        {
          position: [10, 5, 0],
          rotation: [0, Math.PI / 2, 0],
          scale: [20, 10, 1]
        }
      ],
      floor: {
        position: [0, 0, 0],
        scale: [20, 1, 20]
      },
      artworks: [
        {
          id: "artwork-1",
          title: "Modern Mona Lisa",
          image: "https://images.pexels.com/photos/7242755/pexels-photo-7242755.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
          position: [-8, 5, -9.5],
          rotation: [0, 0, 0],
          scale: [4, 6, 0.1]
        },
        {
          id: "artwork-2",
          title: "Digital Last Supper",
          image: "https://images.pexels.com/photos/3693108/pexels-photo-3693108.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
          position: [0, 5, -9.5],
          rotation: [0, 0, 0],
          scale: [6, 4, 0.1]
        },
        {
          id: "artwork-3",
          title: "Neo Vitruvian",
          image: "https://images.pexels.com/photos/6127357/pexels-photo-6127357.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
          position: [8, 5, -9.5],
          rotation: [0, 0, 0],
          scale: [4, 6, 0.1]
        },
        {
          id: "artwork-4",
          title: "Renaissance Reimagined",
          image: "https://images.pexels.com/photos/15286/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
          position: [-9.5, 5, -4],
          rotation: [0, Math.PI / 2, 0],
          scale: [4, 6, 0.1]
        },
        {
          id: "artwork-5",
          title: "Modern Masterpiece",
          image: "https://images.pexels.com/photos/2832382/pexels-photo-2832382.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
          position: [9.5, 5, -4],
          rotation: [0, -Math.PI / 2, 0],
          scale: [4, 6, 0.1]
        }
      ]
    }
  ],
  "raphael": [
    {
      id: "main-hall",
      name: "Main Hall",
      walls: [
        // Back wall
        {
          position: [0, 5, -10],
          rotation: [0, 0, 0],
          scale: [20, 10, 1]
        },
        // Front wall with entrance
        {
          position: [-7.5, 5, 10],
          rotation: [0, 0, 0],
          scale: [5, 10, 1]
        },
        {
          position: [7.5, 5, 10],
          rotation: [0, 0, 0],
          scale: [5, 10, 1]
        },
        // Left wall
        {
          position: [-10, 5, 0],
          rotation: [0, Math.PI / 2, 0],
          scale: [20, 10, 1]
        },
        // Right wall
        {
          position: [10, 5, 0],
          rotation: [0, Math.PI / 2, 0],
          scale: [20, 10, 1]
        }
      ],
      floor: {
        position: [0, 0, 0],
        scale: [20, 1, 20]
      },
      artworks: [
        {
          id: "artwork-1",
          title: "Modern School of Athens",
          image: "https://images.pexels.com/photos/14223111/pexels-photo-14223111.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
          position: [-8, 5, -9.5],
          rotation: [0, 0, 0],
          scale: [4, 6, 0.1]
        },
        {
          id: "artwork-2",
          title: "Digital Madonna",
          image: "https://images.pexels.com/photos/11386307/pexels-photo-11386307.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
          position: [0, 5, -9.5],
          rotation: [0, 0, 0],
          scale: [6, 4, 0.1]
        },
        {
          id: "artwork-3",
          title: "Renaissance Revival",
          image: "https://images.pexels.com/photos/1918290/pexels-photo-1918290.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
          position: [8, 5, -9.5],
          rotation: [0, 0, 0],
          scale: [4, 6, 0.1]
        }
      ]
    }
  ]
};

// Mock data for agents
export const agentData: Agent[] = [
  {
    id: "leonardo",
    name: "Leonardo",
    description: "Renaissance master specializing in realistic portraits with subtle lighting and expressive details.",
    specialty: ["portraits", "realism", "renaissance"],
    collective: "Renaissance Masters",
    avatar: "https://images.pexels.com/photos/16354213/pexels-photo-16354213/free-photo-of-statue-of-da-vinci.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    featured: true,
    gallery: "leonardo",
    stats: {
      promptsHandled: 1243,
      artworksCreated: 892,
      backersCount: 156,
      totalStaked: 2450,
    },
    samples: [
      {
        title: "Modern Mona Lisa",
        image: "https://images.pexels.com/photos/7242755/pexels-photo-7242755.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        promptId: "prompt-1"
      },
      {
        title: "Digital Last Supper",
        image: "https://images.pexels.com/photos/3693108/pexels-photo-3693108.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        promptId: "prompt-2"
      },
      {
        title: "Neo Vitruvian",
        image: "https://images.pexels.com/photos/6127357/pexels-photo-6127357.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        promptId: "prompt-3"
      }
    ]
  },
  {
    id: "raphael",
    name: "Raphael",
    description: "Specializes in harmonious compositions with vibrant colors and elegant, graceful figures.",
    specialty: ["composition", "color", "grace"],
    collective: "Renaissance Masters",
    avatar: "https://images.pexels.com/photos/6664290/pexels-photo-6664290.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    featured: true,
    gallery: "raphael",
    stats: {
      promptsHandled: 1087,
      artworksCreated: 763,
      backersCount: 129,
      totalStaked: 1980,
    },
    samples: [
      {
        title: "Modern School of Athens",
        image: "https://images.pexels.com/photos/14223111/pexels-photo-14223111.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        promptId: "prompt-4"
      },
      {
        title: "Digital Madonna",
        image: "https://images.pexels.com/photos/11386307/pexels-photo-11386307.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        promptId: "prompt-5"
      }
    ]
  },
  {
    id: "michelangelo",
    name: "Michelangelo",
    description: "Focused on sculptural form, anatomical precision, and powerful, dynamic compositions.",
    specialty: ["anatomy", "sculpture", "dynamism"],
    collective: "Renaissance Masters",
    avatar: "https://images.pexels.com/photos/36372/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    featured: true,
    gallery: null,
    stats: {
      promptsHandled: 967,
      artworksCreated: 682,
      backersCount: 143,
      totalStaked: 2210,
    },
    samples: [
      {
        title: "Cybernetic Creation",
        image: "https://images.pexels.com/photos/17068546/pexels-photo-17068546/free-photo-of-augmented-reality-concept.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        promptId: "prompt-6"
      },
      {
        title: "Digital David",
        image: "https://images.pexels.com/photos/9754/mountains-clouds-forest-fog.jpg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        promptId: "prompt-7"
      }
    ]
  },
  {
    id: "caravaggio",
    name: "Caravaggio",
    description: "Master of dramatic lighting, sharp contrasts, and intense emotional expression.",
    specialty: ["chiaroscuro", "drama", "realism"],
    collective: "Baroque Collective",
    avatar: "https://images.pexels.com/photos/301599/pexels-photo-301599.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    featured: true,
    gallery: null,
    stats: {
      promptsHandled: 823,
      artworksCreated: 541,
      backersCount: 98,
      totalStaked: 1580,
    },
    samples: [
      {
        title: "Modern Bacchus",
        image: "https://images.pexels.com/photos/3075988/pexels-photo-3075988.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        promptId: "prompt-8"
      },
      {
        title: "Digital Calling",
        image: "https://images.pexels.com/photos/2832382/pexels-photo-2832382.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        promptId: "prompt-9"
      }
    ]
  },
  {
    id: "botticelli",
    name: "Botticelli",
    description: "Creates ethereal, flowing compositions with mythological themes and elegant linework.",
    specialty: ["mythology", "elegance", "linework"],
    collective: "Early Renaissance Circle",
    avatar: "https://images.pexels.com/photos/207662/pexels-photo-207662.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    featured: false,
    gallery: null,
    stats: {
      promptsHandled: 745,
      artworksCreated: 498,
      backersCount: 87,
      totalStaked: 1320,
    },
    samples: [
      {
        title: "Digital Venus",
        image: "https://images.pexels.com/photos/1918290/pexels-photo-1918290.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        promptId: "prompt-10"
      }
    ]
  },
  {
    id: "titian",
    name: "Titian",
    description: "Renowned for rich, vibrant colors, loose brushwork, and sensual, atmospheric compositions.",
    specialty: ["color", "sensuality", "atmosphere"],
    collective: "Venetian School",
    avatar: "https://images.pexels.com/photos/1269968/pexels-photo-1269968.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    featured: false,
    gallery: null,
    stats: {
      promptsHandled: 682,
      artworksCreated: 463,
      backersCount: 76,
      totalStaked: 1180,
    },
    samples: [
      {
        title: "Digital Bacchinal",
        image: "https://images.pexels.com/photos/3651820/pexels-photo-3651820.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        promptId: "prompt-11"
      }
    ]
  }
];

// API stub functions
export async function listAgents(): Promise<Agent[]> {
  console.log("Calling listAgents API");
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  return agentData;
}

export async function getAgent(id: string): Promise<Agent | null> {
  console.log(`Calling getAgent API for ID: ${id}`);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));
  return agentData.find(agent => agent.id === id) || null;
}

// Real API functions with agent-specific enhancement
export async function sendPrompt(agentId: string, promptText: string): Promise<ChatResponse> {
  console.log(`Sending prompt to agent ${agentId}: ${promptText}`);
  
  // Get agent data from API to enhance prompt with agent-specific characteristics
  let agent = agentData.find(a => a.id === agentId); // Fallback to dummy data
  let enhancedPrompt = promptText;
  
  try {
    // Try to get real agent data from API first
    const apiResponse = await httpClient.get(`/agents/${agentId}`);
    if (apiResponse.data) {
      const apiAgent = apiResponse.data;
      
      // Create comprehensive style context from real agent data
      const identity = apiAgent.identity || {};
      const creative = apiAgent.creative_specs || {};
      const technical = apiAgent.technical_config || {};
      const studio = apiAgent.studio || {};
      
      const styleElements = [];
      
      // Core identity
      if (identity.display_name) {
        styleElements.push(`As ${identity.display_name}`);
      }
      if (identity.archetype) {
        styleElements.push(`(${identity.archetype})`);
      }
      
      // Artistic characteristics
      if (creative.primary_mediums?.length > 0) {
        styleElements.push(`specializing in ${creative.primary_mediums.join(', ')}`);
      }
      if (identity.core_traits?.length > 0) {
        styleElements.push(`with ${identity.core_traits.join(', ')} characteristics`);
      }
      if (creative.colour_palette?.length > 0) {
        styleElements.push(`using a palette of ${creative.colour_palette.join(', ')}`);
      }
      if (creative.signature_motifs?.length > 0) {
        styleElements.push(`featuring motifs like ${creative.signature_motifs.join(', ')}`);
      }
      if (creative.influences?.length > 0) {
        styleElements.push(`influenced by ${creative.influences.join(', ')}`);
      }
      
      // Studio context
      if (studio.theme) {
        styleElements.push(`in a ${studio.theme} studio environment`);
      }
      if (studio.art_style) {
        styleElements.push(`with ${studio.art_style} artistic approach`);
      }
      
      // Voice and style
      if (identity.voice_style) {
        styleElements.push(`Expression style: ${identity.voice_style}`);
      }
      if (creative.prompt_formula) {
        styleElements.push(`Creative approach: ${creative.prompt_formula}`);
      }
      
      const styleContext = [
        styleElements.join(', ') + '.',
        identity.origin_story ? `Background: ${identity.origin_story}` : '',
        `\nUser request: "${promptText}"`,
        `\nCreate artwork that embodies your distinctive artistic vision and style.`
      ].filter(Boolean).join(' ');
      
      enhancedPrompt = styleContext;
      
      console.log('Enhanced prompt with real agent data:', enhancedPrompt);
    }
  } catch (apiError) {
    console.warn(`Failed to fetch agent ${agentId} for style enhancement, using fallback:`, apiError);
    
    // Fallback to dummy data enhancement
    if (agent) {
      const styleContext = [
        `As ${agent.name}, a specialist in ${agent.specialty.join(', ')},`,
        `create artwork that reflects your signature style.`,
        `Your artistic focus: ${agent.description}`,
        `Specialty techniques: ${agent.specialty.join(', ')}`,
        `Collective tradition: ${agent.collective}`,
        `\nUser request: ${promptText}`,
        `\nEnsure the artwork embodies ${agent.name}'s distinctive ${agent.specialty.join(', ')} approach.`
      ].join(' ');
      
      enhancedPrompt = styleContext;
      console.log('Enhanced prompt with dummy data:', enhancedPrompt);
    }
  }
  
  const chatRequest: ChatRequest = {
    message: enhancedPrompt,
    agent_id: agentId,
    thread_id: "default"
  };
  
  try {
    const response = await httpClient.post<ChatResponse>('/chat', chatRequest);
    
    // Log the response for debugging
    console.log('Chat API Response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error sending prompt:', error);
    // Return an error response that matches the expected interface
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send prompt',
      agent_id: agentId,
      thread_id: "default"
    };
  }
}

export async function stake(agentId: string, amount: number): Promise<boolean> {
  console.log(`Staking ${amount} tokens on agent ${agentId}`);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate successful transaction
  return true;
}

export async function buyArtwork(artworkId: string, price: number): Promise<boolean> {
  console.log(`Buying artwork ${artworkId} for ${price} tokens`);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate successful transaction
  return true;
}