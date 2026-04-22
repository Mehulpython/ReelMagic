import { Sparkles } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                Reel<span className="text-primary-400">Magic</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              AI-powered video ad generation. Turn ideas into viral content in seconds.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Product</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/generate" className="transition-colors hover:text-gray-300">Generate</Link></li>
              <li><Link href="/templates" className="transition-colors hover:text-gray-300">Templates</Link></li>
              <li><Link href="/pricing" className="transition-colors hover:text-gray-300">Pricing</Link></li>
              <li><Link href="#" className="transition-colors hover:text-gray-300">API Docs</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Company</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="#" className="transition-colors hover:text-gray-300">About</Link></li>
              <li><Link href="#" className="transition-colors hover:text-gray-300">Blog</Link></li>
              <li><Link href="#" className="transition-colors hover:text-gray-300">Careers</Link></li>
              <li><Link href="#" className="transition-colors hover:text-gray-300">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="#" className="transition-colors hover:text-gray-300">Privacy</Link></li>
              <li><Link href="#" className="transition-colors hover:text-gray-300">Terms</Link></li>
              <li><Link href="#" className="transition-colors hover:text-gray-300">DMCA</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/5 pt-6 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} ReelMagic. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
