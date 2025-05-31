"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ListAgentModal } from "@/components/agents/list-agent-modal";
import { type Agent } from "@/lib/stubs";
import { ChevronRight, TrendingUp } from "lucide-react";

interface AgentTableProps {
  agents: Agent[];
}

export function AgentTable({ agents }: AgentTableProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  
  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Specialty</TableHead>
              <TableHead className="text-right">24h Output</TableHead>
              <TableHead className="text-right">Floor Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={agent.avatar} alt={agent.name} />
                      <AvatarFallback>{agent.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {agent.description}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {agent.specialty.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {agent.stats.artworksCreated} pieces
                </TableCell>
                <TableCell className="text-right">
                  {agent.stats.totalStaked} tokens
                </TableCell>
                <TableCell>
                  <Badge variant={agent.featured ? "default" : "secondary"}>
                    {agent.featured ? "Listed" : "Unlisted"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Trade
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/agents/${agent.id}`}>
                        View
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <ListAgentModal
        agent={selectedAgent}
        open={!!selectedAgent}
        onOpenChange={() => setSelectedAgent(null)}
      />
    </>
  );
}