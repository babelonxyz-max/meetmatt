"use client";

import { motion } from "framer-motion";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showFirstLast?: boolean;
  siblingCount?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
  showFirstLast = true,
  siblingCount = 1,
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - siblingCount && i <= currentPage + siblingCount)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    
    return pages;
  };

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={`flex items-center gap-1 ${className}`}
    >
      {showFirstLast && (
        <PageButton
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="First page"
        >
          ⟪
        </PageButton>
      )}
      
      <PageButton
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ←
      </PageButton>

      {getPageNumbers().map((page, index) =>
        page === "..." ? (
          <span key={index} className="px-3 text-slate-500">
            ...
          </span>
        ) : (
          <PageButton
            key={index}
            onClick={() => onPageChange(page as number)}
            isActive={currentPage === page}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page}
          </PageButton>
        )
      )}

      <PageButton
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        →
      </PageButton>

      {showFirstLast && (
        <PageButton
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Last page"
        >
          ⟫
        </PageButton>
      )}
    </nav>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  isActive,
  ...props
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        min-w-[2.5rem] h-10 px-3 rounded-lg text-sm font-medium
        transition-all duration-200
        hover:scale-105 active:scale-95
        ${
          isActive
            ? "bg-cyan-500 text-white"
            : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
        }
        ${disabled ? "opacity-50 cursor-not-allowed scale-100" : ""}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
