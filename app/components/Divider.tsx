"use client";

interface DividerProps {
  className?: string;
  variant?: "solid" | "dashed" | "dotted";
  color?: "default" | "gradient";
  label?: string;
}

export function Divider({
  className = "",
  variant = "solid",
  color = "default",
  label,
}: DividerProps) {
  const variants = {
    solid: "border-solid",
    dashed: "border-dashed",
    dotted: "border-dotted",
  };

  const colors = {
    default: "border-slate-800",
    gradient:
      "border-transparent bg-gradient-to-r from-transparent via-slate-700 to-transparent h-px",
  };

  if (label) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className={`flex-1 border-t ${variants[variant]} ${colors[color]}`} />
        <span className="text-sm text-slate-500">{label}</span>
        <div className={`flex-1 border-t ${variants[variant]} ${colors[color]}`} />
      </div>
    );
  }

  return (
    <div
      className={`w-full border-t ${variants[variant]} ${colors[color]} ${className}`}
    />
  );
}
