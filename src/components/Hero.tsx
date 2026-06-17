"use client";

import { motion } from "framer-motion";
import { Sparkles, Zap, Play, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

// Sample showcase videos — cycling carousel
const SHOWCASE = [
  {
    prompt: "15-second TikTok ad for a new energy drink targeting Gen Z",
    template: "Product Launch",
    duration: "15s",
    gradient: "from-blue-600 via-cyan-500 to-teal-400",
    icon: "🥤",
  },
  {
    prompt: "Viral reaction meme with fast cuts and trending audio",
    template: "Skibidi Reaction",
    duration: "10s",
    gradient: "from-purple-600 via-pink-500 to-red-500",
    icon: "😱",
  },
  {
    prompt: "Cinematic dropshipping ad for wireless earbuds with urgency triggers",
    template: "Dropship Ad",
    duration: "20s",
    gradient: "from-emerald-500 via-green-400 to-lime-300",
    icon: "🎧",
  },
  {
    prompt: "Bold political ad with patriotic visuals and professional voiceover",
    template: "Political Ad",
    duration: "30s",
    gradient: "from-amber-500 via-orange-500 to-red-600",
    icon: "🗳️",
  },
];

function ShowcaseCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % SHOWCASE.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      {/* Main showcase */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 glow-border">
        {/* Gradient background that changes */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${SHOWCASE[active].gradient} opacity-30 transition-all duration-700`}
        />
        <div className="absolute inset-0 bg-black/40" />

        {/* Content */}
        <div className="relative aspect-[9/16] sm:aspect-video flex flex-col items-center justify-center p-8 gap-4">
          {/* Play button mock */}
          <motion.div
            key={`play-${active}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="rounded-full bg-white/10 backdrop-blur-md p-5 border border-white/20"
          >
            <Play className="h-8 w-8 text-white" fill="white" />
          </motion.div>

          {/* Template badge */}
          <motion.div
            key={`badge-${active}`}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-center"
          >
            <div className="text-3xl mb-2">{SHOWCASE[active].icon}</div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 text-xs text-white/80">
              <span className="font-semibold">{SHOWCASE[active].template}</span>
              <span className="text-white/40">·</span>
              <span>{SHOWCASE[active].duration}</span>
            </div>
          </motion.div>

          {/* Prompt */}
          <motion.p
            key={`prompt-${active}`}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="max-w-md text-center text-sm text-white/60 italic"
          >
            &ldquo;{SHOWCASE[active].prompt}&rdquo;
          </motion.p>

          {/* "Generated in" badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm px-2.5 py-1 text-[10px] text-white/50"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Generated in 45s
          </motion.div>
        </div>

        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {SHOWCASE.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? "w-6 bg-white" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* "Try this prompt" CTA */}
      <Link
        href={`/generate?template=${SHOWCASE[active].template.toLowerCase().replace(/\s+/g, "-")}`}
        className="mt-3 flex items-center justify-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
      >
        Try this prompt <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-12 sm:py-20">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-hero-gradient" />

      {/* Animated gradient orbs */}
      <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-primary-600/20 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-accent-500/10 blur-[100px]" />
      <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-800/15 blur-[80px] animate-float" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Two column layout */}
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-1.5 text-sm text-primary-300 backdrop-blur-sm"
            >
              <Sparkles className="h-4 w-4" />
              <span>Powered by AI — Generate videos in seconds</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl"
            >
              Turn Ideas Into{" "}
              <span className="gradient-text">Viral Video Ads</span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mb-8 max-w-xl text-lg text-gray-400 lg:mx-0"
            >
              AI-powered video generation for memes, product promos, political ads and more.
              Just describe it, we create it — with voiceover, music, and captions.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col items-center gap-4 sm:flex-row lg:items-start lg:justify-start"
            >
              <Link href="/generate" className="btn-primary group inline-flex items-center gap-2 text-lg">
                <Play className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                Start Creating →
              </Link>
              <Link href="/templates" className="btn-secondary inline-flex items-center gap-2">
                <Zap className="h-4 w-4" />
                View Templates
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-gray-500 lg:justify-start"
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary-500" />
                <span>5 free videos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent-500" />
                <span>Ready in 60 seconds</span>
              </div>
            </motion.div>
          </div>

          {/* Right: showcase carousel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative mx-auto max-w-sm lg:max-w-md"
          >
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary-600/20 to-accent-500/10 blur-2xl" />
            <div className="relative">
              <ShowcaseCarousel />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
