// Agent types
export interface Agent {
  id: string;
  name: string;
  slug: string;
  purpose: string;
  features: string[];
  type: string;
  tier: string;
  status: AgentStatus;
  devinSessionId?: string;
  devinUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AgentStatus = "deploying" | "running" | "stopped" | "error";

export interface AgentConfig {
  name: string;
  purpose: string;
  features: string[];
  type: string;
  tier: string;
}

// Payment types
export interface Payment {
  id: string;
  agentId: string;
  amount: number;
  currency: string;
  cryptoCurrency?: string;
  status: PaymentStatus;
  paymentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "expired";

// User types
export interface User {
  id: string;
  email?: string;
  walletAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// Component props types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Theme types
export type Theme = "light" | "dark" | "system";

// Animation types
export type AnimationDirection = "up" | "down" | "left" | "right" | "none";
export type AnimationVariant = "fade" | "slide" | "scale" | "bounce";

// Form types
export interface FormField<T = string> {
  value: T;
  error?: string;
  touched: boolean;
  valid: boolean;
}

export interface FormState {
  [key: string]: FormField;
}

// Notification types
export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

// Feature types
export interface Feature {
  id: string;
  name: string;
  description: string;
  icon: string;
  category?: string;
}

// Pricing types
export interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: "one-time" | "monthly" | "yearly";
  features: string[];
  popular?: boolean;
}

// Crypto types
export interface CryptoCurrency {
  code: string;
  name: string;
  icon: string;
  color: string;
}

// Stats types
export interface Stat {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  description?: string;
}

// Testimonial types
export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company?: string;
  avatar?: string;
  rating: number;
}

// FAQ types
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

// Nav types
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  external?: boolean;
}

// SEO types
export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  noIndex?: boolean;
  canonical?: string;
}

// Devin API types
export interface DevinSession {
  sessionId: string;
  url: string;
  status: string;
}

export interface DevinConfig {
  prompt: string;
  name?: string;
}
