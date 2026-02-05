"use client";

import { useEffect, useRef, ReactNode } from "react";

interface FocusTrapProps {
  children: ReactNode;
  isActive: boolean;
  onEscape?: () => void;
}

export function FocusTrap({ children, isActive, onEscape }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isActive) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus the first focusable element in the trap
      const container = containerRef.current;
      if (container) {
        const focusableElements = container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        if (firstElement) {
          firstElement.focus();
        }
      }

      // Handle Tab key to cycle focus
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && onEscape) {
          onEscape();
          return;
        }

        if (e.key !== "Tab") return;

        const container = containerRef.current;
        if (!container) return;

        const focusableElements = container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        // Restore previous focus
        previousFocusRef.current?.focus();
      };
    }
  }, [isActive, onEscape]);

  return <div ref={containerRef}>{children}</div>;
}
