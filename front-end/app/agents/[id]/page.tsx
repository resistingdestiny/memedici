import { AgentProfileClient } from "./agent-profile-client";

// Add generateStaticParams for static export compatibility
export async function generateStaticParams() {
  // For static export, we need to provide some default agent IDs
  // You can add more IDs here as needed
  return [
    { id: 'default' },
    { id: 'artist-1' },
    { id: 'curator' }
  ];
}

export default function AgentProfilePage() {
  return <AgentProfileClient />;
}