"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface TemplateCardProps {
  id: string;
  name: string;
  description: string;
  gradient?: string;
}

export function TemplateCard({ id, name, description, gradient = "from-purple-600 to-blue-500" }: TemplateCardProps) {
  return (
    <div className="glass-card group overflow-hidden transition-all duration-300 hover:border-primary-500/30 hover:shadow-lg hover:shadow-primary-500/10">
      {/* Thumbnail placeholder */}
      <div
        className={`relative h-44 w-full bg-gradient-to-br ${gradient} opacity-80 transition-opacity duration-300 group-hover:opacity-100`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/30 p-4 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="mb-1.5 text-lg font-semibold text-white">{name}</h3>
        <p className="mb-4 text-sm text-gray-400 leading-relaxed">{description}</p>
        <Link
          href={`/generate?template=${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-400 transition-colors hover:text-primary-300"
        >
          Use Template
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
