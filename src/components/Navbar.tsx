"use client";

import Link from "next/link";
import { Sparkles, Menu, X } from "lucide-react";
import { useState } from "react";
import {
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton,
  SignUpButton,
} from "@clerk/nextjs";

const NAV_LINKS = [
  { href: "/generate", label: "Generate" },
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">
            Reel<span className="text-primary-400">Magic</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </Link>
          ))}

          {/* Signed-in link */}
          <SignedIn>
            <Link
              href="/dashboard"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              My Videos
            </Link>
          </SignedIn>
        </div>

        {/* Auth controls — desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary-500">
                Get Started
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
          </SignedIn>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-gray-400 hover:bg-white/5 md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/5 px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </Link>
            ))}

            <SignedIn>
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                My Videos
              </Link>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-4 py-2.5 text-left text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 rounded-lg bg-primary-600 px-4 py-2.5 text-center text-sm font-medium text-white"
                >
                  Get Started
                </button>
              </SignUpButton>
            </SignedOut>

            <SignedIn>
              <div className="mt-2 flex items-center gap-3 px-4 py-2.5">
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8",
                    },
                  }}
                />
              </div>
            </SignedIn>
          </div>
        </div>
      )}
    </nav>
  );
}
