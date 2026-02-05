"use client";

import { useEffect, useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AccessibleModal } from "./AccessibleModal";
import { Button } from "./Button";

interface ExitIntentProps {
  children: ReactNode;
  title?: string;
  description?: string;
  delay?: number;
  showOnce?: boolean;
}

export function ExitIntent({
  children,
  title = "Wait! Don't Miss Out",
  description = "Get 10% off your first AI agent deployment. Limited time offer!",
  delay = 500,
  showOnce = true,
}: ExitIntentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    if (showOnce && hasShown) return;

    let mouseY = 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseY = e.clientY;
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (e.relatedTarget === null && mouseY < 100) {
        if (showOnce && hasShown) return;
        
        setTimeout(() => {
          setIsOpen(true);
          setHasShown(true);
        }, delay);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, [delay, showOnce, hasShown]);

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title={title}
      description={description}
    >
      <div className="space-y-6">
        {children}
        <div className="flex gap-3">
          <Button
            onClick={() => setIsOpen(false)}
            variant="outline"
            className="flex-1"
          >
            No Thanks
          </Button>
          <Button
            onClick={() => {
              setIsOpen(false);
              window.location.href = "/pricing";
            }}
            className="flex-1"
          >
            Claim Offer
          </Button>
        </div>
      </div>
    </AccessibleModal>
  );
}
