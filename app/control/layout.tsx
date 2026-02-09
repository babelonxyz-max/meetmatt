import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "CONTROL - Admin Panel",
  description: "Project management and database administration",
};

export default function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {children}
    </div>
  );
}
