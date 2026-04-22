"use client";

import { motion } from "framer-motion";
import { Sparkles, Zap, Play } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-6">
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

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-1.5 text-sm text-primary-300 backdrop-blur-sm"
        >
          <Sparkles className="h-4 w-4" />
          <span>Powered by AI — Generate videos in seconds</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl"
        >
          Turn Ideas Into{" "}
          <span className="gradient-text">Viral Video Ads</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mb-10 max-w-2xl text-lg text-gray-400 sm:text-xl"
        >
          AI-powered video generation for memes, political ads, product promos
          and more. Just describe it, we create it.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
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
          className="mt-16 flex items-center justify-center gap-8 text-sm text-gray-500"
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary-500" />
            <span>3 free videos</span>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <div className="h-2 w-2 rounded-full bg-accent-500" />
            <span>Ready in 60 seconds</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
