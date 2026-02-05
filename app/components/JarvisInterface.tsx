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
  children?: ReactNode;
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

  // Show only last 3 messages for no-scroll experience
  const visibleMessages = messages.slice(-3);

  return (
    <div className="relative h-full flex flex-col">
      {/* Subtle header - blended */}
      <div className="flex items-center gap-4 p-3 border-b border-[var(--border)]/50 bg-gradient-to-r from-[var(--card)]/40 to-transparent backdrop-blur-sm">
        {canGoBack && (
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg bg-[var(--card)]/50 hover:bg-[var(--card-hover)]/50 transition-colors border border-[var(--border)]/50"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
        )}
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0ea5e9]/80 to-[#6366f1]/80 flex items-center justify-center shadow-lg shadow-[#0ea5e9]/10">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <motion.div
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[var(--background)]"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          
          <div>
            <h3 className="font-medium text-[var(--foreground)] text-sm">MATT</h3>
            <p className="text-[10px] text-[var(--muted)] font-mono flex items-center gap-1">
              <Activity className="w-2.5 h-2.5" />
              ONLINE
            </p>
          </div>
        </div>

        {/* Minimal status */}
        <div className="ml-auto flex items-center gap-2 text-[9px] font-mono text-[var(--muted)]">
          <Cpu className="w-3 h-3" />
          <span>ACTIVE</span>
        </div>
      </div>

      {/* Messages Area - Blended Video Game Style */}
      <div className="flex-1 overflow-hidden p-4 space-y-3 relative">
        {/* Subtle scanline effect */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, var(--foreground) 2px, var(--foreground) 4px)',
          }}
        />

        <AnimatePresence mode="popLayout">
          {visibleMessages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`relative flex gap-3 ${
                message.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {/* Avatar - smaller, more subtle */}
              <div className={`flex-shrink-0 ${message.role === "user" ? "hidden" : ""}`}>
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                  message.role === "assistant"
                    ? "bg-gradient-to-br from-[#0ea5e9]/70 to-[#6366f1]/70"
                    : "bg-[var(--card)]/50"
                }`}>
                  {message.role === "assistant" ? (
                    <Bot className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-[var(--foreground)]" />
                  )}
                </div>
              </div>

              {/* Message Content - Blended, floating style */}
              <div className={`max-w-[90%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`relative px-4 py-3 rounded-xl ${
                    message.role === "user"
                      ? "bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 text-[var(--foreground)] backdrop-blur-sm"
                      : "bg-[var(--card)]/30 border border-[var(--border)]/30 text-[var(--foreground)] backdrop-blur-md"
                  }`}
                >
                  {/* Glow effect for assistant */}
                  {message.role === "assistant" && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0ea5e9]/5 to-transparent pointer-events-none" />
                  )}
                  
                  <p className="text-sm leading-relaxed relative z-10">{message.content}</p>

                  {/* Options - Floating style */}
                  {message.options && message.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {message.options.map((option) => (
                        <motion.button
                          key={option}
                          onClick={() => onOptionClick(option)}
                          onMouseEnter={() => setHoveredOption(option)}
                          onMouseLeave={() => setHoveredOption(null)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className={`relative px-3 py-1.5 text-xs font-mono rounded-md border transition-all backdrop-blur-sm ${
                            hoveredOption === option
                              ? "bg-[#0ea5e9]/20 border-[#0ea5e9]/50 text-[#0ea5e9]"
                              : "bg-[var(--card)]/40 border-[var(--border)]/40 text-[var(--muted)] hover:border-[#0ea5e9]/30 hover:text-[var(--foreground)]"
                          }`}
                        >
                          {option}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator - Minimal */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#0ea5e9]/70 to-[#6366f1]/70 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-[var(--card)]/30 border border-[var(--border)]/30 rounded-lg px-3 py-2 flex items-center gap-1.5 backdrop-blur-sm">
              <span className="text-[10px] font-mono text-[var(--muted)]">thinking</span>
              {[...Array(3)].map((_, i) => (
                <motion.span
                  key={i}
                  className="w-1 h-1 bg-[#0ea5e9] rounded-full"
                  animate={{ 
                    opacity: [0.3, 1, 0.3],
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
            className="flex items-center gap-3 p-3 bg-[#0ea5e9]/5 rounded-lg border border-[#0ea5e9]/10 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Cpu className="w-4 h-4 text-[#0ea5e9]" />
            </motion.div>
            <div className="flex-1">
              <p className="text-xs font-mono text-[#0ea5e9]">DEPLOYING...</p>
              <div className="mt-1.5 h-0.5 bg-[var(--card)]/50 rounded-full overflow-hidden">
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

      {/* Custom Content Area - Blended */}
      {children && (
        <div className="border-t border-[var(--border)]/50 bg-[var(--card)]/20 backdrop-blur-sm">
          {children}
        </div>
      )}
    </div>
  );
}
