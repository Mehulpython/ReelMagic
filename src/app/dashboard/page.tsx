import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, Film, Coins, PlusCircle } from "lucide-react";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-amber-400 bg-clip-text text-transparent">
            Welcome back
          </h1>
          <p className="text-gray-400 mt-2">Manage your video ads and create new ones</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[#1a1a2e] rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <Film className="w-5 h-5 text-purple-400" />
              <span className="text-gray-400 text-sm">Videos Created</span>
            </div>
            <p className="text-3xl font-bold">0</p>
          </div>
          <div className="bg-[#1a1a2e] rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <Coins className="w-5 h-5 text-amber-400" />
              <span className="text-gray-400 text-sm">Credits Remaining</span>
            </div>
            <p className="text-3xl font-bold">10</p>
          </div>
          <div className="bg-[#1a1a2e] rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-gray-400 text-sm">Plan</span>
            </div>
            <p className="text-3xl font-bold">Free</p>
          </div>
        </div>

        {/* Create CTA */}
        <div className="bg-gradient-to-r from-purple-600/20 to-amber-600/20 rounded-xl p-8 border border-purple-500/30 mb-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Create Your First Video Ad</h2>
              <p className="text-gray-400">Choose a template and describe your vision. AI does the rest.</p>
            </div>
            <Link
              href="/generate"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-amber-500 px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <PlusCircle className="w-5 h-5" />
              New Video
            </Link>
          </div>
        </div>

        {/* Recent Jobs - Empty State */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Videos</h2>
          <div className="bg-[#1a1a2e] rounded-xl p-12 border border-gray-800 text-center">
            <Film className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No videos yet</p>
            <p className="text-gray-500 text-sm">Your generated videos will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
