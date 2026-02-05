"use client";

import { useEffect, useState, useRef } from "react";
import { useInView } from "framer-motion";

interface TextScrambleProps {
  text: string;
  className?: string;
  duration?: number;
  trigger?: "inView" | "hover" | "mount";
}

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

export function TextScramble({
  text,
  className = "",
  duration = 2000,
  trigger = "inView",
}: TextScrambleProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [displayText, setDisplayText] = useState(text);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated) return;
    
    const shouldAnimate = 
      (trigger === "inView" && isInView) ||
      (trigger === "mount");
    
    if (!shouldAnimate) return;
    
    setHasAnimated(true);
    let iteration = 0;
    const totalIterations = text.length * 3;
    
    const interval = setInterval(() => {
      setDisplayText(
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < iteration / 3) {
              return text[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );
      
      iteration += 1;
      
      if (iteration >= totalIterations) {
        clearInterval(interval);
        setDisplayText(text);
      }
    }, duration / totalIterations);

    return () => clearInterval(interval);
  }, [isInView, text, duration, trigger, hasAnimated]);

  return (
    <span ref={ref} className={className}>
      {displayText}
    </span>
  );
}
