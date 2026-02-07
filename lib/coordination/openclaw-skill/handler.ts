#!/usr/bin/env node
// Swarm Coordinator Skill Handler for OpenClaw
// This runs as a standalone service that bots can query

import http from "http";
import { URL } from "url";

// In-memory coordination store (simple version for single-server deployment)
// For multi-server, replace with Redis

interface Claim {
  botId: string;
  claimedAt: number;
  expiresAt: number;
  status: "claimed" | "processing" | "completed" | "failed";
}

interface BotState {
  id: string;
  name: string;
  weight: number;
  lastResponseAt?: number;
  responseCount: number;
  status: "online" | "busy" | "cooldown" | "offline";
}

const claims = new Map<string, Claim>();
const bots = new Map<string, BotState>();
const stats = {
  totalMessages: 0,
  totalResponses: 0,
  claimsGranted: 0,
  claimsDenied: 0,
};

// Configuration
const CONFIG = {
  claimTtlMs: 30000,      // 30 seconds
  cooldownMs: 3000,       // 3 seconds between responses
  cleanupIntervalMs: 10000,
  port: parseInt(process.env.COORDINATOR_PORT || "3847"),
};

// Priority keywords
const URGENT_KEYWORDS = ["urgent", "help", "emergency", "asap", "now", "please help"];
const HIGH_KEYWORDS = ["please", "question", "?", "how", "what", "why", "can you"];

function claimKey(chatId: string, messageId: string): string {
  return `${chatId}:${messageId}`;
}

function determinePriority(text: string, isMention: boolean): "urgent" | "high" | "normal" | "low" {
  if (isMention) return "urgent";
  
  const lower = text.toLowerCase();
  
  for (const kw of URGENT_KEYWORDS) {
    if (lower.includes(kw)) return "urgent";
  }
  
  for (const kw of HIGH_KEYWORDS) {
    if (lower.includes(kw)) return "high";
  }
  
  return "normal";
}

function tryClaim(
  chatId: string,
  messageId: string,
  botId: string
): { success: boolean; reason: string } {
  const key = claimKey(chatId, messageId);
  const now = Date.now();
  
  // Check existing claim
  const existing = claims.get(key);
  if (existing && existing.expiresAt > now && existing.status !== "failed") {
    stats.claimsDenied++;
    return { success: false, reason: "already-claimed" };
  }
  
  // Check bot cooldown
  const bot = bots.get(botId);
  if (bot && bot.lastResponseAt) {
    const timeSince = now - bot.lastResponseAt;
    if (timeSince < CONFIG.cooldownMs) {
      stats.claimsDenied++;
      return { success: false, reason: "cooldown" };
    }
  }
  
  // Grant claim
  claims.set(key, {
    botId,
    claimedAt: now,
    expiresAt: now + CONFIG.claimTtlMs,
    status: "claimed",
  });
  
  // Update bot state
  if (bot) {
    bot.status = "busy";
  }
  
  stats.claimsGranted++;
  stats.totalMessages++;
  
  return { success: true, reason: "claimed" };
}

function completeClaim(chatId: string, messageId: string, botId: string): void {
  const key = claimKey(chatId, messageId);
  const claim = claims.get(key);
  
  if (claim && claim.botId === botId) {
    claim.status = "completed";
    stats.totalResponses++;
    
    const bot = bots.get(botId);
    if (bot) {
      bot.status = "online";
      bot.lastResponseAt = Date.now();
      bot.responseCount++;
    }
  }
}

function registerBot(id: string, name: string, weight: number): void {
  bots.set(id, {
    id,
    name,
    weight,
    responseCount: 0,
    status: "online",
  });
  console.log(`[Coordinator] Bot registered: ${name} (${id})`);
}

function cleanupExpired(): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, claim] of claims.entries()) {
    if (claim.expiresAt < now) {
      claims.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[Coordinator] Cleaned ${cleaned} expired claims`);
  }
}

// HTTP Server
const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${CONFIG.port}`);
  const path = url.pathname;
  
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Parse JSON body for POST requests
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  
  req.on("end", () => {
    let data: Record<string, unknown> = {};
    
    if (body) {
      try {
        data = JSON.parse(body);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }
    }
    
    // Route handling
    try {
      if (path === "/check" && req.method === "POST") {
        // Check if bot should respond
        const { chat_id, message_id, bot_id, message_text, is_mention } = data as {
          chat_id: string;
          message_id: string;
          bot_id: string;
          message_text?: string;
          is_mention?: boolean;
        };
        
        if (!chat_id || !message_id || !bot_id) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required fields" }));
          return;
        }
        
        const priority = determinePriority(message_text || "", is_mention || false);
        const result = tryClaim(chat_id, message_id, bot_id);
        
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          should_respond: result.success,
          reason: result.reason,
          priority,
        }));
        
      } else if (path === "/complete" && req.method === "POST") {
        // Mark response as complete
        const { chat_id, message_id, bot_id } = data as {
          chat_id: string;
          message_id: string;
          bot_id: string;
        };
        
        completeClaim(chat_id, message_id, bot_id);
        
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
        
      } else if (path === "/register" && req.method === "POST") {
        // Register a bot
        const { bot_id, bot_name, weight } = data as {
          bot_id: string;
          bot_name: string;
          weight?: number;
        };
        
        registerBot(bot_id, bot_name, weight || 5);
        
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
        
      } else if (path === "/status" && req.method === "GET") {
        // Get status
        const botList = Array.from(bots.values()).map((b) => ({
          id: b.id,
          name: b.name,
          status: b.status,
          responseCount: b.responseCount,
        }));
        
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          stats,
          bots: botList,
          activeClaims: claims.size,
        }));
        
      } else if (path === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
        
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      }
    } catch (err) {
      console.error("[Coordinator] Error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });
});

// Start cleanup interval
setInterval(cleanupExpired, CONFIG.cleanupIntervalMs);

// Start server
server.listen(CONFIG.port, () => {
  console.log(`[Coordinator] Swarm Coordinator running on port ${CONFIG.port}`);
  console.log(`[Coordinator] Endpoints:`);
  console.log(`  POST /check    - Check if bot should respond`);
  console.log(`  POST /complete - Mark response complete`);
  console.log(`  POST /register - Register a bot`);
  console.log(`  GET  /status   - Get swarm status`);
  console.log(`  GET  /health   - Health check`);
});
