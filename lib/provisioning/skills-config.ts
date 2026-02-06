// OpenClaw Skills Configuration for Meet Matt
// Defines pre-determined skills by package type with dynamic skill matching

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  permissions: SkillPermission[];
  riskLevel: "safe" | "medium" | "high";
  keywords: string[];  // For dynamic matching
  clawHubId?: string;  // Official ClawHub skill ID
}

export type SkillCategory = 
  | "productivity"
  | "calendar_email"
  | "developer"
  | "devops"
  | "content"
  | "research"
  | "messaging"
  | "data"
  | "automation"
  | "support"
  | "docs";

export type SkillPermission = 
  | "network"
  | "file_read"
  | "file_write"
  | "exec"
  | "browser"
  | "none";

// Master skill catalog - all available skills
export const SKILL_CATALOG: SkillDefinition[] = [
  // === PRODUCTIVITY & OFFICE ===
  {
    id: "todoist",
    name: "Todoist",
    description: "Task management with Todoist",
    category: "productivity",
    permissions: ["network", "exec"],
    riskLevel: "medium",
    keywords: ["task", "todo", "reminder", "checklist", "productivity"],
    clawHubId: "clawdbot/todoist",
  },
  {
    id: "apple-notes",
    name: "Apple Notes",
    description: "Manage Apple Notes on macOS",
    category: "productivity",
    permissions: ["exec"],
    riskLevel: "medium",
    keywords: ["notes", "apple", "memo", "write"],
  },
  {
    id: "apple-reminders",
    name: "Apple Reminders",
    description: "Handle Apple Reminders",
    category: "productivity",
    permissions: ["exec"],
    riskLevel: "medium",
    keywords: ["reminder", "alert", "schedule", "apple"],
  },
  {
    id: "notion",
    name: "Notion Integration",
    description: "Notion database and page operations",
    category: "productivity",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["notion", "wiki", "database", "knowledge", "docs"],
    clawHubId: "clawdbot/notion",
  },
  {
    id: "obsidian",
    name: "Obsidian Vault",
    description: "Manage Obsidian markdown vaults",
    category: "productivity",
    permissions: ["file_read", "file_write"],
    riskLevel: "medium",
    keywords: ["obsidian", "markdown", "notes", "vault", "zettelkasten"],
  },
  {
    id: "trello",
    name: "Trello Boards",
    description: "Trello board and card management",
    category: "productivity",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["trello", "kanban", "board", "cards", "project"],
  },
  {
    id: "asana",
    name: "Asana Tasks",
    description: "Asana task and project operations",
    category: "productivity",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["asana", "project", "task", "team", "workflow"],
  },
  {
    id: "linear",
    name: "Linear Issues",
    description: "Linear issue and project tracking",
    category: "productivity",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["linear", "issue", "sprint", "roadmap", "engineering"],
  },

  // === CALENDAR & EMAIL ===
  {
    id: "gcalcli",
    name: "Google Calendar",
    description: "Command-line Google Calendar management",
    category: "calendar_email",
    permissions: ["network", "exec", "file_read", "file_write"],
    riskLevel: "medium",
    keywords: ["calendar", "google", "schedule", "meeting", "event", "appointment"],
    clawHubId: "clawdbot/gcalcli",
  },
  {
    id: "apple-calendar",
    name: "Apple Calendar",
    description: "macOS Calendar app integration",
    category: "calendar_email",
    permissions: ["exec"],
    riskLevel: "medium",
    keywords: ["calendar", "apple", "ical", "schedule"],
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Gmail read, compose, and send",
    category: "calendar_email",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["email", "gmail", "mail", "inbox", "compose", "send"],
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    description: "Outlook email and calendar",
    category: "calendar_email",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["outlook", "microsoft", "email", "calendar", "office365"],
  },

  // === DEVELOPER TOOLS ===
  {
    id: "github",
    name: "GitHub Integration",
    description: "Manage repos, issues, PRs, and actions",
    category: "developer",
    permissions: ["network", "exec"],
    riskLevel: "high",
    keywords: ["github", "git", "repo", "pr", "pull request", "issue", "code", "commit"],
    clawHubId: "clawdbot/github",
  },
  {
    id: "gitlab",
    name: "GitLab Integration",
    description: "GitLab repos, MRs, and CI/CD",
    category: "developer",
    permissions: ["network", "exec"],
    riskLevel: "high",
    keywords: ["gitlab", "git", "merge request", "ci", "pipeline"],
  },
  {
    id: "code-search",
    name: "Code Search",
    description: "Search code across repositories",
    category: "developer",
    permissions: ["network", "file_read"],
    riskLevel: "medium",
    keywords: ["search", "code", "grep", "find", "regex"],
  },
  {
    id: "agent-development",
    name: "Agent Development",
    description: "Development prompts and best practices for AI agents",
    category: "developer",
    permissions: ["none"],
    riskLevel: "safe",
    keywords: ["agent", "ai", "development", "prompt", "best practices"],
    clawHubId: "clawdbot/agent-development",
  },
  {
    id: "npm-registry",
    name: "NPM Registry",
    description: "Search and manage npm packages",
    category: "developer",
    permissions: ["network", "exec"],
    riskLevel: "high",
    keywords: ["npm", "node", "package", "javascript", "typescript"],
  },
  {
    id: "docker",
    name: "Docker Management",
    description: "Manage Docker containers and images",
    category: "developer",
    permissions: ["exec"],
    riskLevel: "high",
    keywords: ["docker", "container", "image", "kubernetes", "k8s"],
  },
  {
    id: "vscode",
    name: "VS Code Integration",
    description: "Control VS Code remotely",
    category: "developer",
    permissions: ["exec"],
    riskLevel: "medium",
    keywords: ["vscode", "editor", "ide", "code"],
  },

  // === DEVOPS & INFRASTRUCTURE ===
  {
    id: "aws-cli",
    name: "AWS CLI",
    description: "AWS service management",
    category: "devops",
    permissions: ["network", "exec"],
    riskLevel: "high",
    keywords: ["aws", "amazon", "cloud", "ec2", "s3", "lambda"],
  },
  {
    id: "vercel",
    name: "Vercel Deployments",
    description: "Manage Vercel deployments and domains",
    category: "devops",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["vercel", "deploy", "hosting", "serverless", "nextjs"],
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    description: "Cloudflare DNS and Workers",
    category: "devops",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["cloudflare", "dns", "cdn", "workers", "pages"],
  },
  {
    id: "logs-viewer",
    name: "Log Viewer",
    description: "View and search application logs",
    category: "devops",
    permissions: ["file_read", "network"],
    riskLevel: "medium",
    keywords: ["logs", "debug", "error", "monitoring", "trace"],
  },
  {
    id: "uptime-monitor",
    name: "Uptime Monitor",
    description: "Check service health and uptime",
    category: "devops",
    permissions: ["network"],
    riskLevel: "safe",
    keywords: ["uptime", "health", "status", "monitoring", "ping"],
  },

  // === CONTENT & MARKETING ===
  {
    id: "seo-tools",
    name: "SEO Tools",
    description: "SEO analysis and optimization",
    category: "content",
    permissions: ["network"],
    riskLevel: "safe",
    keywords: ["seo", "keywords", "ranking", "google", "search"],
  },
  {
    id: "social-media",
    name: "Social Media Manager",
    description: "Schedule and post to social platforms",
    category: "content",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["twitter", "linkedin", "facebook", "instagram", "social", "post"],
  },
  {
    id: "copywriting",
    name: "Copywriting Assistant",
    description: "Generate marketing copy and headlines",
    category: "content",
    permissions: ["none"],
    riskLevel: "safe",
    keywords: ["copy", "headline", "marketing", "ad", "slogan"],
  },
  {
    id: "image-gen",
    name: "Image Generation",
    description: "Generate images with AI",
    category: "content",
    permissions: ["network"],
    riskLevel: "safe",
    keywords: ["image", "picture", "generate", "dall-e", "midjourney", "art"],
  },
  {
    id: "video-summarize",
    name: "Video Summarizer",
    description: "Summarize YouTube and video content",
    category: "content",
    permissions: ["network"],
    riskLevel: "safe",
    keywords: ["youtube", "video", "summarize", "transcript"],
  },

  // === RESEARCH & WEB ===
  {
    id: "web-search",
    name: "Web Search",
    description: "Search the web for information",
    category: "research",
    permissions: ["network"],
    riskLevel: "safe",
    keywords: ["search", "google", "web", "find", "lookup"],
  },
  {
    id: "web-scrape",
    name: "Web Scraper",
    description: "Extract data from web pages",
    category: "research",
    permissions: ["network", "browser"],
    riskLevel: "medium",
    keywords: ["scrape", "extract", "crawl", "data", "website"],
  },
  {
    id: "arxiv",
    name: "arXiv Papers",
    description: "Search and summarize academic papers",
    category: "research",
    permissions: ["network"],
    riskLevel: "safe",
    keywords: ["arxiv", "paper", "research", "academic", "science"],
  },
  {
    id: "wikipedia",
    name: "Wikipedia",
    description: "Search and read Wikipedia articles",
    category: "research",
    permissions: ["network"],
    riskLevel: "safe",
    keywords: ["wikipedia", "wiki", "encyclopedia", "knowledge"],
  },
  {
    id: "news-reader",
    name: "News Reader",
    description: "Fetch and summarize news articles",
    category: "research",
    permissions: ["network"],
    riskLevel: "safe",
    keywords: ["news", "article", "headline", "current events"],
  },
  {
    id: "package-tracking",
    name: "Package Tracking",
    description: "Track shipments and packages",
    category: "research",
    permissions: ["network"],
    riskLevel: "safe",
    keywords: ["tracking", "package", "shipping", "delivery", "fedex", "ups"],
    clawHubId: "clawdbot/17track",
  },

  // === DOCS & SHEETS ===
  {
    id: "google-docs",
    name: "Google Docs",
    description: "Create and edit Google Docs",
    category: "docs",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["google docs", "document", "write", "edit"],
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    description: "Manage Google Sheets spreadsheets",
    category: "docs",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["sheets", "spreadsheet", "excel", "data", "table"],
  },
  {
    id: "pdf-tools",
    name: "PDF Tools",
    description: "Read, create, and edit PDFs",
    category: "docs",
    permissions: ["file_read", "file_write"],
    riskLevel: "medium",
    keywords: ["pdf", "document", "convert", "merge"],
  },
  {
    id: "agent-docs",
    name: "Agent Docs",
    description: "Documentation for AI agents",
    category: "docs",
    permissions: ["none"],
    riskLevel: "safe",
    keywords: ["docs", "documentation", "help", "reference"],
    clawHubId: "clawdbot/agent-docs",
  },

  // === DATA PROCESSING ===
  {
    id: "csv-tools",
    name: "CSV Tools",
    description: "Parse and manipulate CSV files",
    category: "data",
    permissions: ["file_read", "file_write"],
    riskLevel: "medium",
    keywords: ["csv", "data", "parse", "export", "import"],
  },
  {
    id: "json-tools",
    name: "JSON Tools",
    description: "Parse and transform JSON data",
    category: "data",
    permissions: ["file_read", "file_write"],
    riskLevel: "medium",
    keywords: ["json", "api", "data", "transform"],
  },
  {
    id: "sql-query",
    name: "SQL Query",
    description: "Execute SQL queries on databases",
    category: "data",
    permissions: ["network", "exec"],
    riskLevel: "high",
    keywords: ["sql", "database", "query", "postgres", "mysql"],
  },

  // === MESSAGING & COMMUNITY ===
  {
    id: "slack",
    name: "Slack Integration",
    description: "Send and read Slack messages",
    category: "messaging",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["slack", "message", "channel", "team"],
  },
  {
    id: "discord",
    name: "Discord Integration",
    description: "Discord server and channel management",
    category: "messaging",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["discord", "server", "channel", "bot"],
  },
  {
    id: "beepctl",
    name: "Beeper",
    description: "Beeper Desktop API integration",
    category: "messaging",
    permissions: ["network", "exec", "file_read", "file_write"],
    riskLevel: "medium",
    keywords: ["beeper", "message", "chat", "unified"],
    clawHubId: "clawdbot/beepctl",
  },

  // === SUPPORT & CUSTOMER SERVICE ===
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Zendesk ticket management",
    category: "support",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["zendesk", "ticket", "support", "customer", "helpdesk"],
  },
  {
    id: "intercom",
    name: "Intercom",
    description: "Intercom conversations and users",
    category: "support",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["intercom", "chat", "support", "customer"],
  },
  {
    id: "freshdesk",
    name: "Freshdesk",
    description: "Freshdesk ticket operations",
    category: "support",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["freshdesk", "ticket", "support", "helpdesk"],
  },
  {
    id: "knowledge-base",
    name: "Knowledge Base",
    description: "Search and retrieve from knowledge base",
    category: "support",
    permissions: ["network", "file_read"],
    riskLevel: "safe",
    keywords: ["faq", "knowledge", "help", "documentation", "answer"],
  },
  {
    id: "canned-responses",
    name: "Canned Responses",
    description: "Pre-approved response templates",
    category: "support",
    permissions: ["file_read"],
    riskLevel: "safe",
    keywords: ["template", "response", "canned", "quick reply"],
  },

  // === AUTOMATION ===
  {
    id: "zapier",
    name: "Zapier",
    description: "Trigger and manage Zapier workflows",
    category: "automation",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["zapier", "automation", "workflow", "trigger", "zap"],
  },
  {
    id: "make",
    name: "Make (Integromat)",
    description: "Make.com scenario automation",
    category: "automation",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["make", "integromat", "automation", "scenario"],
  },
  {
    id: "n8n",
    name: "n8n Workflows",
    description: "n8n workflow automation",
    category: "automation",
    permissions: ["network"],
    riskLevel: "medium",
    keywords: ["n8n", "workflow", "automation", "self-hosted"],
  },
  {
    id: "cron-scheduler",
    name: "Cron Scheduler",
    description: "Schedule recurring tasks",
    category: "automation",
    permissions: ["exec"],
    riskLevel: "medium",
    keywords: ["cron", "schedule", "recurring", "timer", "job"],
  },
];

// Package type definitions with default skills
export interface PackageSkillConfig {
  packageType: string;
  description: string;
  defaultSkills: string[];  // Skill IDs
  optionalSkills: string[];  // Can be enabled on request
  blockedSkills: string[];  // Never allow for this package
  maxSkills: number;
}

export const PACKAGE_SKILL_CONFIGS: Record<string, PackageSkillConfig> = {
  assistant: {
    packageType: "assistant",
    description: "Personal AI assistant for daily tasks",
    defaultSkills: [
      // Productivity (5)
      "todoist", "notion", "obsidian", "trello", "linear",
      // Calendar & Email (4)
      "gcalcli", "gmail", "apple-calendar", "apple-reminders",
      // Research (5)
      "web-search", "wikipedia", "news-reader", "package-tracking", "arxiv",
      // Docs (3)
      "google-docs", "google-sheets", "pdf-tools",
      // Automation (2)
      "zapier", "cron-scheduler",
      // Messaging (1)
      "slack",
    ],
    optionalSkills: [
      "apple-notes", "asana", "outlook", "social-media", 
      "image-gen", "video-summarize", "discord", "beepctl",
    ],
    blockedSkills: [
      "sql-query", "docker", "aws-cli",  // Too dangerous for personal use
    ],
    maxSkills: 30,
  },

  support: {
    packageType: "support",
    description: "Customer support bot with safe, controlled responses",
    defaultSkills: [
      // Support (5)
      "zendesk", "intercom", "freshdesk", "knowledge-base", "canned-responses",
      // Research (3)
      "web-search", "wikipedia", "news-reader",
      // Docs (2)
      "agent-docs", "pdf-tools",
      // Messaging (2)
      "slack", "discord",
      // Productivity (3)
      "todoist", "notion", "trello",
    ],
    optionalSkills: [
      "gmail", "google-docs", "google-sheets", "csv-tools",
    ],
    blockedSkills: [
      // No exec, no file write, no dangerous operations
      "github", "gitlab", "docker", "aws-cli", "sql-query",
      "npm-registry", "web-scrape", "code-search",
    ],
    maxSkills: 20,
  },

  coder: {
    packageType: "coder",
    description: "Developer assistant with code and DevOps capabilities",
    defaultSkills: [
      // Developer (7)
      "github", "gitlab", "code-search", "agent-development", 
      "npm-registry", "docker", "vscode",
      // DevOps (5)
      "aws-cli", "vercel", "cloudflare", "logs-viewer", "uptime-monitor",
      // Research (4)
      "web-search", "arxiv", "wikipedia", "news-reader",
      // Data (3)
      "csv-tools", "json-tools", "sql-query",
      // Productivity (3)
      "linear", "notion", "todoist",
      // Docs (2)
      "agent-docs", "google-docs",
    ],
    optionalSkills: [
      "trello", "asana", "slack", "discord", "gmail",
      "web-scrape", "zapier", "n8n", "make",
    ],
    blockedSkills: [],  // Coders get full access
    maxSkills: 40,
  },

  writer: {
    packageType: "writer",
    description: "Content creation and writing assistant",
    defaultSkills: [
      // Content (5)
      "seo-tools", "social-media", "copywriting", "image-gen", "video-summarize",
      // Research (5)
      "web-search", "wikipedia", "news-reader", "arxiv", "web-scrape",
      // Docs (4)
      "google-docs", "google-sheets", "pdf-tools", "agent-docs",
      // Productivity (4)
      "notion", "obsidian", "todoist", "trello",
      // Calendar (2)
      "gcalcli", "gmail",
    ],
    optionalSkills: [
      "slack", "discord", "zapier", "csv-tools", "json-tools",
    ],
    blockedSkills: [
      // Writers don't need code/devops
      "github", "gitlab", "docker", "aws-cli", "sql-query",
      "npm-registry", "code-search",
    ],
    maxSkills: 25,
  },

  custom: {
    packageType: "custom",
    description: "Custom configuration - user selects skills",
    defaultSkills: [
      // Minimal safe defaults
      "web-search", "wikipedia", "agent-docs", "todoist", "notion",
    ],
    optionalSkills: SKILL_CATALOG.map(s => s.id),  // All skills available
    blockedSkills: [],
    maxSkills: 50,
  },
};

// Dynamic skill matching based on user request text
export interface SkillMatch {
  skillId: string;
  confidence: number;  // 0-1
  matchedKeywords: string[];
}

/**
 * Match skills based on user's session request text
 * Returns skills that should be auto-added based on what user describes
 */
export function matchSkillsFromRequest(
  requestText: string,
  packageType: string,
  existingSkills: string[] = []
): SkillMatch[] {
  const config = PACKAGE_SKILL_CONFIGS[packageType];
  if (!config) return [];

  const requestLower = requestText.toLowerCase();
  const words = requestLower.split(/\s+/);
  const matches: SkillMatch[] = [];

  for (const skill of SKILL_CATALOG) {
    // Skip if already included or blocked
    if (existingSkills.includes(skill.id)) continue;
    if (config.blockedSkills.includes(skill.id)) continue;

    const matchedKeywords: string[] = [];
    
    for (const keyword of skill.keywords) {
      // Check for exact word match or phrase match
      if (words.includes(keyword) || requestLower.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > 0) {
      // Calculate confidence based on keyword matches
      const confidence = Math.min(matchedKeywords.length / skill.keywords.length, 1);
      
      matches.push({
        skillId: skill.id,
        confidence,
        matchedKeywords,
      });
    }
  }

  // Sort by confidence and return top matches
  return matches
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);  // Max 10 auto-suggested skills
}

/**
 * Get the complete skill configuration for a package
 * Includes default skills + any matched skills from request
 */
export function getSkillsForPackage(
  packageType: string,
  userRequest?: string
): {
  skills: string[];
  suggested: SkillMatch[];
  config: PackageSkillConfig;
} {
  const config = PACKAGE_SKILL_CONFIGS[packageType] || PACKAGE_SKILL_CONFIGS.custom;
  let skills = [...config.defaultSkills];
  let suggested: SkillMatch[] = [];

  if (userRequest) {
    suggested = matchSkillsFromRequest(userRequest, packageType, skills);
    
    // Auto-add high-confidence matches (>0.5)
    for (const match of suggested) {
      if (match.confidence >= 0.5 && skills.length < config.maxSkills) {
        skills.push(match.skillId);
      }
    }
  }

  // Ensure we don't exceed max skills
  skills = skills.slice(0, config.maxSkills);

  return { skills, suggested, config };
}

/**
 * Get skill details by ID
 */
export function getSkillById(skillId: string): SkillDefinition | undefined {
  return SKILL_CATALOG.find(s => s.id === skillId);
}

/**
 * Get all skills for a category
 */
export function getSkillsByCategory(category: SkillCategory): SkillDefinition[] {
  return SKILL_CATALOG.filter(s => s.category === category);
}

/**
 * Validate that a skill can be added to a package
 */
export function canAddSkill(skillId: string, packageType: string): {
  allowed: boolean;
  reason?: string;
} {
  const config = PACKAGE_SKILL_CONFIGS[packageType];
  if (!config) {
    return { allowed: false, reason: "Invalid package type" };
  }

  if (config.blockedSkills.includes(skillId)) {
    return { allowed: false, reason: "Skill is blocked for this package type" };
  }

  const skill = getSkillById(skillId);
  if (!skill) {
    return { allowed: false, reason: "Skill not found" };
  }

  return { allowed: true };
}

// Heartbeat configuration - always enabled by default
export interface HeartbeatConfig {
  enabled: boolean;
  intervalMinutes: number;
  notifyOnError: boolean;
  notifyOnRecovery: boolean;
  telegramChatId?: string;
}

export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  enabled: true,
  intervalMinutes: 5,
  notifyOnError: true,
  notifyOnRecovery: true,
};

/**
 * Generate OpenClaw config with skills and heartbeat
 */
export function generateOpenClawConfig(
  packageType: string,
  userRequest?: string,
  heartbeatChatId?: string
): {
  skills: { list: string[] };
  heartbeat: HeartbeatConfig;
  suggested: SkillMatch[];
} {
  const { skills, suggested } = getSkillsForPackage(packageType, userRequest);
  
  const heartbeat: HeartbeatConfig = {
    ...DEFAULT_HEARTBEAT_CONFIG,
    telegramChatId: heartbeatChatId,
  };

  return {
    skills: { list: skills },
    heartbeat,
    suggested,
  };
}
