"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Settings, Activity, ExternalLink, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { getSessionId } from "@/lib/session";

interface Agent {
  id: string;
  name: string;
  status: string;
  tier: string;
  createdAt: string;
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAgents = async () => {
      const sessionId = getSessionId();
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/agents?sessionId=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setAgents(data.agents || []);
        }
      } catch (e) {
        console.error("Failed to fetch agents:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Navigation */}
      <nav className="border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md fixed top-0 left-0 right-0 z-50">
        <div className="h-14 px-4 flex items-center justify-between max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-zinc-500" />
            <Sparkles className="w-5 h-5 text-[#0ea5e9]" />
            <span className="font-semibold">Meet Matt</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Create new agent
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-20 pb-12 px-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Your Agents</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {agents.length === 0 
                ? "No agents yet. Create your first one." 
                : `You have ${agents.length} agent${agents.length !== 1 ? 's' : ''} deployed.`}
            </p>
          </div>
          <Link href="/">
            <Button className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Agent
            </Button>
          </Link>
        </div>

        {/* Search */}
        {agents.length > 0 && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
            />
          </div>
        )}

        {/* Agents Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">No agents found</h3>
            <p className="text-sm text-zinc-500 mb-6">
              {searchQuery 
                ? "No agents match your search." 
                : "Create your first AI assistant to get started."}
            </p>
            <Link href="/">
              <Button className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Agent
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group p-4 bg-white/5 border border-white/5 rounded-xl hover:border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center">
                    <span className="text-lg font-bold text-white">
                      {agent.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                    agent.status === "active" 
                      ? "bg-green-500/10 text-green-400" 
                      : "bg-zinc-500/10 text-zinc-400"
                  }`}>
                    {agent.status}
                  </div>
                </div>
                
                <h3 className="font-medium text-white mb-1 truncate">{agent.name}</h3>
                <p className="text-xs text-zinc-500 mb-4 capitalize">{agent.tier} tier</p>
                
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Activity className="w-3 h-3" />
                  <span>Created {new Date(agent.createdAt).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
