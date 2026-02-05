"use client";

import { motion } from "framer-motion";
import { Rating } from "./Rating";
import { Card, CardBody } from "./Card";

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  company?: string;
  rating?: number;
  avatar?: string;
  className?: string;
}

export function TestimonialCard({
  quote,
  author,
  role,
  company,
  rating = 5,
  avatar,
  className = "",
}: TestimonialCardProps) {
  return (
    <Card hover glow className={className}>
      <CardBody className="space-y-4">
        <Rating value={rating} className="text-amber-400" />
        
        <blockquote className="text-slate-300 italic leading-relaxed">
          "{quote}"
        </blockquote>
        
        <div className="flex items-center gap-3 pt-2">
          {avatar ? (
            <img
              src={avatar}
              alt={author}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-semibold">
              {author.charAt(0)}
            </div>
          )}
          <div>
            <div className="font-medium text-slate-200">{author}</div>
            <div className="text-sm text-slate-500">
              {role}{company && ` at ${company}`}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
