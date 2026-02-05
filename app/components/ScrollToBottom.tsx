"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface ScrollToBottomProps {
  containerRef: React.RefObject<HTMLElement>;
}

export function ScrollToBottom({ containerRef }: ScrollToBottomProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsVisible(!isNearBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [containerRef]);

  const scrollToBottom = () => {
    const container = containerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          onClick={scrollToBottom}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-3 py-1.5 bg-[#0ea5e9] text-white text-xs rounded-full shadow-lg shadow-[#0ea5e9]/30 hover:bg-[#0284c7] transition-colors"
        >
          <ChevronDown className="w-3 h-3" />
          New messages
        </motion.button>
      )}
    </AnimatePresence>
  );
}
