"use client";

import { ReactNode } from "react";

interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  isCurrent?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: ReactNode;
}

export function Breadcrumb({
  items,
  className = "",
  separator = "/",
}: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center flex-wrap gap-2 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-slate-600" aria-hidden="true">
                {separator}
              </span>
            )}
            {item.isCurrent ? (
              <span
                className="text-slate-300 font-medium"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : item.href ? (
              <a
                href={item.href}
                className="text-slate-500 hover:text-cyan-400 transition-colors"
              >
                {item.label}
              </a>
            ) : (
              <span className="text-slate-500">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
