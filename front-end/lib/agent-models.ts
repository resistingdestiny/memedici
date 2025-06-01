/**
 * Agent Model Assignment System
 * Randomly assigns robot models to agents and persists them in localStorage
 */

// Available robot/character models
export const AVAILABLE_ROBOT_MODELS = [
  'cyberpunk_robot.glb',
  'robot_playground.glb', 
  'diamond_hands.glb',
  'the_artist.glb'
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

// Get model for a specific agent (assign if not exists)
export function getModelForAgent(agentId: string): string {
  const assignments = getAgentModelAssignments();
  
  // Check if agent already has an assignment
  const existing = assignments.find(a => a.agentId === agentId);
  if (existing) {
    console.log(`🤖 Using existing model for ${agentId}: ${existing.modelFile}`);
    return existing.modelFile;
  }
  
  // Assign a random model
  const randomModel = AVAILABLE_ROBOT_MODELS[Math.floor(Math.random() * AVAILABLE_ROBOT_MODELS.length)];
  
  // Create new assignment
  const newAssignment: AgentModelAssignment = {
    agentId,
    modelFile: randomModel,
    assignedAt: new Date().toISOString()
  };
  
  // Save new assignment
  const updatedAssignments = [...assignments, newAssignment];
  saveAgentModelAssignments(updatedAssignments);
  
  console.log(`🎲 Assigned new model to ${agentId}: ${randomModel}`);
  return randomModel;
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