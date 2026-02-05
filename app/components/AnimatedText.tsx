"use client";

import { motion, useInView, Variants } from "framer-motion";
import { useRef, ReactNode } from "react";

interface AnimatedTextProps {
  children: string;
  className?: string;
  type?: "chars" | "words" | "lines";
  delay?: number;
  staggerDelay?: number;
  once?: boolean;
}

export function AnimatedText({
  children,
  className = "",
  type = "words",
  delay = 0,
  staggerDelay = 0.03,
  once = true,
}: AnimatedTextProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: 0.5 });

  const items = type === "chars" 
    ? children.split("") 
    : type === "words" 
    ? children.split(" ") 
    : [children];

  const container: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  };

  const child: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.span
      ref={ref}
      variants={container}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={className}
      aria-label={children}
    >
      {items.map((item, index) => (
        <motion.span
          key={index}
          variants={child}
          className="inline-block"
          style={{ whiteSpace: "pre" }}
        >
          {item}
          {type === "words" && index < items.length - 1 && " "}
        </motion.span>
      ))}
    </motion.span>
  );
}

interface TypewriterProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
  cursor?: boolean;
}

export function Typewriter({
  text,
  className = "",
  speed = 50,
  delay = 0,
  cursor = true,
}: TypewriterProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 1 }}
    >
      {isInView && (
        <>
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: "auto" }}
            transition={{
              duration: (text.length * speed) / 1000,
              delay: delay / 1000,
              ease: "linear",
            }}
            className="inline-block overflow-hidden whitespace-nowrap"
          >
            {text}
          </motion.span>
          {cursor && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{
                repeat: Infinity,
                duration: 0.8,
                ease: "linear",
              }}
              className="inline-block w-0.5 h-[1em] bg-current ml-0.5 align-middle"
            />
          )}
        </>
      )}
    </motion.span>
  );
}
