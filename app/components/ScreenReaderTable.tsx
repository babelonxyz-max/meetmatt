"use client";

import { ReactNode } from "react";

interface ScreenReaderTableProps {
  caption: string;
  headers: string[];
  rows: (string | number | ReactNode)[][];
  className?: string;
}

export function ScreenReaderTable({
  caption,
  headers,
  rows,
  className = "",
}: ScreenReaderTableProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-left border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-slate-800">
            {headers.map((header, index) => (
              <th
                key={index}
                scope="col"
                className="py-3 px-4 text-sm font-semibold text-slate-300"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="py-3 px-4 text-sm text-slate-400"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
