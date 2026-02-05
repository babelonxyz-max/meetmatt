"use client";

import { motion } from "framer-motion";
import { CountUp } from "./CountUp";
import { Card, CardBody } from "./Card";

interface StatCardProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  value,
  label,
  prefix = "",
  suffix = "",
  description,
  icon,
  className = "",
}: StatCardProps) {
  return (
    <Card hover glow className={className}>
      <CardBody className="text-center">
        {icon && (
          <div className="text-3xl mb-3 text-cyan-400 flex justify-center">
            {icon}
          </div>
        )}
        <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
          <CountUp
            end={value}
            prefix={prefix}
            suffix={suffix}
            duration={2000}
          />
        </div>
        <div className="text-slate-300 font-medium mb-1">{label}</div>
        {description && (
          <div className="text-sm text-slate-500">{description}</div>
        )}
      </CardBody>
    </Card>
  );
}
