// Motion variants with reduced motion support

export const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

// Safe animation props that respect user preferences
export const safeAnimate = (animate: Record<string, any>) => {
  if (prefersReducedMotion()) {
    return {};
  }
  return animate;
};

// Common animation variants
export const fadeIn = {
  initial: prefersReducedMotion() ? {} : { opacity: 0 },
  animate: { opacity: 1 },
  exit: prefersReducedMotion() ? {} : { opacity: 0 },
};

export const slideUp = {
  initial: prefersReducedMotion() ? {} : { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: prefersReducedMotion() ? {} : { opacity: 0, y: -20 },
};

export const scale = {
  initial: prefersReducedMotion() ? {} : { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: prefersReducedMotion() ? {} : { opacity: 0, scale: 0.95 },
};

// Transition presets
export const transitions = {
  fast: { duration: 0.2 },
  normal: { duration: 0.3 },
  slow: { duration: 0.5 },
  spring: { type: "spring", stiffness: 500, damping: 30 },
};
