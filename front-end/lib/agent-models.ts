/**
 * Agent Model Assignment System
 * Randomly assigns robot models to agents and persists them in localStorage
 * NOTE: These models are for AGENTS ONLY - not for studio buildings
 */

// Available robot/character models for AI agents
export const AVAILABLE_ROBOT_MODELS = [
  'cyberpunk_robot.glb',      // Cyberpunk-themed agent - AGENT ONLY, not for buildings
  'robot_playground.glb',     // Playground robot agent
  'diamond_hands.glb',        // Diamond hands character
  'the_artist.glb'            // Artist character
];

// Additional models for roaming artists with more variety
export const ROAMING_ARTIST_MODELS = [
  'cyberpunk_robot.glb',
  'destiny_-_ghost_follower_giveaway.glb',
  'genshin_destiny2_paimon_ghost.glb', 
  'ghost_ship.glb'
];

const STORAGE_KEY = 'medici-agent-model-assignments';

// Type for agent-model assignments
export interface AgentModelAssignment {
  agentId: string;
  modelFile: string;
  assignedAt: string;
}

// Get all current assignments
export function getAgentModelAssignments(): AgentModelAssignment[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading agent model assignments:', error);
    return [];
  }
}

// Save assignments to localStorage
function saveAgentModelAssignments(assignments: AgentModelAssignment[]) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
    console.log('🤖 Saved agent model assignments:', assignments.length, 'agents');
  } catch (error) {
    console.error('Error saving agent model assignments:', error);
  }
}

/**
 * Get a robot model for an agent ensuring variety across the system
 * @param agentId - The unique agent identifier
 * @param agentIndex - The index of this agent in the overall list (for variety)
 * @param totalAgents - Total number of agents (to determine if we need variety)
 */
export function getAgentModel(agentId: string, agentIndex: number = 0, totalAgents: number = 1): string {
  // For the first N agents, ensure we cover all model types for variety
  if (agentIndex < AVAILABLE_ROBOT_MODELS.length && totalAgents >= AVAILABLE_ROBOT_MODELS.length) {
    console.log(`🎭 Assigning ${AVAILABLE_ROBOT_MODELS[agentIndex]} to agent ${agentId} for variety (position ${agentIndex + 1})`);
    return AVAILABLE_ROBOT_MODELS[agentIndex];
  }
  
  // For additional agents, use consistent hash-based assignment
  const seed = agentId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const modelIndex = seed % AVAILABLE_ROBOT_MODELS.length;
  
  console.log(`🎲 Assigning ${AVAILABLE_ROBOT_MODELS[modelIndex]} to agent ${agentId} via hash`);
  return AVAILABLE_ROBOT_MODELS[modelIndex];
}

/**
 * Get a roaming artist model with variety preference
 */
export function getRoamingArtistModel(agentId: string, agentIndex: number = 0): string {
  // Ensure variety for the first batch of roaming artists
  if (agentIndex < ROAMING_ARTIST_MODELS.length) {
    return ROAMING_ARTIST_MODELS[agentIndex];
  }
  
  // Use hash for consistent assignment after variety is ensured
  const seed = agentId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const modelIndex = seed % ROAMING_ARTIST_MODELS.length;
  return ROAMING_ARTIST_MODELS[modelIndex];
}

// Reassign a specific agent (for testing/admin)
export function reassignAgentModel(agentId: string, modelFile?: string): string {
  const assignments = getAgentModelAssignments();
  
  // Remove existing assignment
  const filteredAssignments = assignments.filter(a => a.agentId !== agentId);
  
  // Use provided model or pick random
  const newModel = modelFile || AVAILABLE_ROBOT_MODELS[Math.floor(Math.random() * AVAILABLE_ROBOT_MODELS.length)];
  
  // Create new assignment
  const newAssignment: AgentModelAssignment = {
    agentId,
    modelFile: newModel,
    assignedAt: new Date().toISOString()
  };
  
  // Save updated assignments
  const updatedAssignments = [...filteredAssignments, newAssignment];
  saveAgentModelAssignments(updatedAssignments);
  
  console.log(`🔄 Reassigned model for ${agentId}: ${newModel}`);
  return newModel;
}

// Clear all assignments (for reset)
export function clearAllAssignments() {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(STORAGE_KEY);
  console.log('🧹 Cleared all agent model assignments');
}

// Get assignment stats for debugging
export function getAssignmentStats() {
  const assignments = getAgentModelAssignments();
  const stats: Record<string, number> = {};
  
  assignments.forEach(assignment => {
    stats[assignment.modelFile] = (stats[assignment.modelFile] || 0) + 1;
  });
  
  return {
    totalAssignments: assignments.length,
    modelDistribution: stats,
    assignments
  };
} 