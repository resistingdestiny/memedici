import { agentData } from "@/lib/stubs";
import { AgentProfileClient } from "./agent-profile-client";

export async function generateStaticParams() {
  return agentData.map((agent) => ({
    id: agent.id,
  }));
}

export default function AgentProfilePage() {
  return <AgentProfileClient />;
}