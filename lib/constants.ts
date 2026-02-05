// App constants
export const APP_NAME = "Meet Matt";
export const APP_URL = "https://meetmatt.xyz";
export const APP_EMAIL = "matt@meetmatt.xyz";

// Pricing
export const PRICING = {
  SETUP: 150,
  SETUP_ORIGINAL: 250,
  MONTHLY: 150,
  DAILY: 5,
  CURRENCY: "USD",
} as const;

// Features list
export const FEATURES_LIST = [
  { id: "Email management", icon: "📧", description: "Read, draft, organize emails" },
  { id: "Calendar scheduling", icon: "📅", description: "Schedule meetings automatically" },
  { id: "Meeting notes", icon: "📝", description: "Take and summarize meeting notes" },
  { id: "Research", icon: "🔍", description: "Web research and data gathering" },
  { id: "Data entry", icon: "📊", description: "Enter and organize data" },
  { id: "Content creation", icon: "✍️", description: "Write blog posts and social media" },
  { id: "Customer support", icon: "💬", description: "Handle customer inquiries" },
  { id: "Reminders", icon: "⏰", description: "Set and manage reminders" },
  { id: "Travel booking", icon: "✈️", description: "Book flights and hotels" },
  { id: "Expense tracking", icon: "💰", description: "Track and categorize expenses" },
  { id: "Document drafting", icon: "📄", description: "Create documents and contracts" },
  { id: "Social media", icon: "📱", description: "Manage social media accounts" },
  { id: "Lead generation", icon: "🎯", description: "Find and qualify leads" },
  { id: "Reporting", icon: "📈", description: "Generate reports and analytics" },
  { id: "Translation", icon: "🌐", description: "Translate content" },
  { id: "File organization", icon: "🗂️", description: "Organize files and folders" },
] as const;

// Agent types
export const AGENT_TYPES = [
  { id: "executive", name: "Executive Assistant", description: "High-level support for executives", icon: "👔" },
  { id: "admin", name: "Administrative", description: "General admin and office tasks", icon: "📋" },
  { id: "sales", name: "Sales Support", description: "Lead gen and sales assistance", icon: "💼" },
  { id: "marketing", name: "Marketing", description: "Content and campaign management", icon: "📢" },
  { id: "personal", name: "Personal Assistant", description: "Personal tasks and scheduling", icon: "🏠" },
  { id: "specialized", name: "Specialized", description: "Industry-specific tasks", icon: "⚙️" },
] as const;

// Cryptocurrencies
export const SUPPORTED_CRYPTO = [
  { code: "btc", name: "Bitcoin", icon: "₿", color: "#F7931A" },
  { code: "eth", name: "Ethereum", icon: "Ξ", color: "#627EEA" },
  { code: "usdt", name: "Tether (USDT)", icon: "₮", color: "#26A17B" },
  { code: "usdc", name: "USD Coin", icon: "$", color: "#2775CA" },
  { code: "bnb", name: "BNB", icon: "B", color: "#F3BA2F" },
  { code: "sol", name: "Solana", icon: "◎", color: "#14F195" },
  { code: "xrp", name: "XRP", icon: "X", color: "#23292F" },
  { code: "ada", name: "Cardano", icon: "₳", color: "#0033AD" },
  { code: "avax", name: "Avalanche", icon: "A", color: "#E84142" },
  { code: "doge", name: "Dogecoin", icon: "Ð", color: "#C2A633" },
  { code: "dot", name: "Polkadot", icon: "●", color: "#E6007A" },
  { code: "matic", name: "Polygon", icon: "M", color: "#8247E5" },
] as const;

// Social links
export const SOCIAL_LINKS = {
  twitter: "https://twitter.com/meetmatt",
  github: "https://github.com/meetmatt",
  discord: "https://discord.gg/meetmatt",
} as const;

// Meta information
export const META = {
  title: "Meet Matt | Deploy Your AI Agent in 15 Minutes",
  description: "Get your own AI agent for $5/day. Matt deploys custom AI assistants in 15 minutes using Devin AI. Automate emails, scheduling, research, and more.",
  keywords: ["AI agent", "virtual assistant", "Devin AI", "automation", "AI assistant"],
  author: "Meet Matt",
  ogImage: "/og-image.jpg",
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  THEME: "theme",
  CHAT_HISTORY: "chat_history",
  USER_PREFERENCES: "user_preferences",
  CART: "cart",
} as const;

// Timeouts
export const TIMEOUTS = {
  DEBOUNCE: 300,
  TOAST: 5000,
  POLLING: 5000,
  SESSION: 30 * 60 * 1000, // 30 minutes
} as const;

// Breakpoints (in pixels)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;
