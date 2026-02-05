"use client";

import { useState, useCallback } from "react";
import { createContext, useContext, ReactNode } from "react";

type AnnouncementType = "polite" | "assertive";

interface AnnouncementContextType {
  announce: (message: string, type?: AnnouncementType) => void;
}

const AnnouncementContext = createContext<AnnouncementContextType | undefined>(undefined);

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");

  const announce = useCallback((message: string, type: AnnouncementType = "polite") => {
    if (type === "polite") {
      setPoliteMessage(message);
    } else {
      setAssertiveMessage(message);
    }
    
    // Clear after announcement
    setTimeout(() => {
      if (type === "polite") {
        setPoliteMessage("");
      } else {
        setAssertiveMessage("");
      }
    }, 1000);
  }, []);

  return (
    <AnnouncementContext.Provider value={{ announce }}>
      {children}
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AnnouncementContext.Provider>
  );
}

export function useAnnouncement() {
  const context = useContext(AnnouncementContext);
  if (!context) {
    throw new Error("useAnnouncement must be used within AnnouncementProvider");
  }
  return context;
}
