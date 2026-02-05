"use client";

import { useState, useEffect } from "react";

interface LiveRegionProps {
  message: string;
  type?: "polite" | "assertive";
  className?: string;
}

export function LiveRegion({ message, type = "polite", className = "" }: LiveRegionProps) {
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    // Clear first to ensure screen reader announces even if same message
    setAnnouncement("");
    const timer = setTimeout(() => setAnnouncement(message), 100);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div
      role={type === "assertive" ? "alert" : "status"}
      aria-live={type}
      aria-atomic="true"
      className={`sr-only ${className}`}
    >
      {announcement}
    </div>
  );
}
