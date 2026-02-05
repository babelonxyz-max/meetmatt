"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, ChevronLeft, Terminal, Cpu, Activity } from "lucide-react";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  options?: string[];
}

interface JarvisInterfaceProps {
  messages: Message[];
  isTyping: boolean;
  isDeploying: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onOptionClick: (option: string) => void;
  children?: ReactNode; // For custom input or feature selectors
}

export function JarvisInterface({
  messages,
  isTyping,
  isDeploying,
  canGoBack,
  onBack,
  onOptionClick,
  children,
}: JarvisInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      {/* Header - Jarvis Style */}
      <div className="flex items-center gap-4 p-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--card)] to-transparent">
        {canGoBack && (
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg bg-[var(--card)] hover:bg-[var(--card-hover)] transition-colors border border-[var(--border)]"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
        )}
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center shadow-lg shadow-[#0ea5e9]/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <motion.div
              className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--background)]"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          
          <div>
            <h3 className="font-medium text-[var(--foreground)]">MATT</h3>
            <p className="text-xs text-[var(--muted)] font-mono flex items-center gap-1">
              <Activity className="w-3 h-3" />
              SYSTEM ONLINE
            </p>
          </div>
        </div>

        {/* Status indicators */}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--muted)]">
            <Cpu className="w-3 h-3" />
            <span>AI CORE: ACTIVE</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--muted)]">
            <Terminal className="w-3 h-3" />
            <span>V2.1</span>
          </div>
        </div>
      </div>

      {/* Messages Area - Holographic Style */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        {/* Grid overlay effect */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--border) 1px, transparent 1px),
              linear-gradient(to bottom, var(--border) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, x: message.role === "user" ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`relative flex gap-3 ${
                message.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 ${message.role === "user" ? "hidden" : ""}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  message.role === "assistant"
                    ? "bg-gradient-to-br from-[#0ea5e9] to-[#6366f1]"
                    : "bg-[var(--card)]"
                }`}>
                  {message.role === "assistant" ? (
                    <Bot className="w-4 h-4 text-white" />
                  ) : (
                    <User className="w-4 h-4 text-[var(--foreground)]" />
                  )}
                </div>
              </div>

              {/* Message Content */}
              <div className={`max-w-[85%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`relative p-4 rounded-lg ${
                    message.role === "user"
                      ? "bg-[#0ea5e9]/20 border border-[#0ea5e9]/30 text-[var(--foreground)]"
                      : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]"
                  }`}
                >
                  {/* Corner accent for assistant messages */}
                  {message.role === "assistant" && (
                    <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-[#0ea5e9]/50 -translate-x-px -translate-y-px" />
                  )}
                  
                  <p className="text-sm leading-relaxed">{message.content}</p>

                  {/* Options */}
                  {message.options && message.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {message.options.map((option) => (
                        <motion.button
                          key={option}
                          onClick={() => onOptionClick(option)}
                          onMouseEnter={() => setHoveredOption(option)}
                          onMouseLeave={() => setHoveredOption(null)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`relative px-4 py-2 text-xs font-mono rounded border transition-all ${
                            hoveredOption === option
                              ? "bg-[#0ea5e9]/20 border-[#0ea5e9] text-[#0ea5e9]"
                              : "bg-[var(--card)] border-[var(--border)] text-[var(--muted)] hover:border-[#0ea5e9]/50 hover:text-[var(--foreground)]"
                          }`}
                        >
                          {/* Scan line effect */}
                          {hoveredOption === option && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0ea5e9]/10 to-transparent"
                              animate={{ x: ["-100%", "100%"] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                            />
                          )}
                          <span className="relative z-10">{option}</span>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-[10px] font-mono text-[var(--muted)] mt-1 px-1">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator - Jarvis Style */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 flex items-center gap-2">
              <span className="text-xs font-mono text-[var(--muted)]">PROCESSING</span>
              {[...Array(3)].map((_, i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 bg-[#0ea5e9] rounded-full"
                  animate={{ 
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Deploying Indicator */}
        {isDeploying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-4 bg-[#0ea5e9]/10 rounded-lg border border-[#0ea5e9]/20"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Cpu className="w-5 h-5 text-[#0ea5e9]" />
            </motion.div>
            <div className="flex-1">
              <p className="text-sm font-mono text-[#0ea5e9]">DEPLOYING AGENT...</p>
              <div className="mt-2 h-1 bg-[var(--card)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#0ea5e9]"
                  initial={{ width: "0%" }}
                  animate={{ width: ["0%", "40%", "60%", "80%", "100%"] }}
                  transition={{ duration: 8, ease: "linear" }}
                />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Custom Content Area (for inputs, selectors) */}
      {children && (
        <div className="border-t border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-sm">
          {children}
        </div>
      )}
    </div>
  );
}
