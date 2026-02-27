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
    <div className="h-[calc(100vh-64px)] sm:h-[calc(100vh-80px)] bg-[#0a0a0b] text-white overflow-hidden">
      {children}
    </div>
  );
}
