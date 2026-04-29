import { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import WatchClient from "./WatchClient";

// ─── Generate SEO metadata for social sharing ────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = createServerClient();
    const { data: job } = await supabase
      .from("video_jobs")
      .select("prompt, thumbnail_url, created_at, profiles(full_name)")
      .eq("id", id)
      .eq("status", "completed")
      .single();

    if (!job) return {};

    const title = `AI Video Ad — ${job.prompt?.slice(0, 60) || "Created with ReelMagic"}`;
    const creatorName = (job.profiles as any)?.[0]?.full_name || (job.profiles as any)?.full_name || "Someone";
    const description = `Generated with ReelMagic AI. ${creatorName} created this ${(job as any).duration_seconds || ""}s video ad.`;
    const image = job.thumbnail_url || undefined;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: image ? [{ url: image }] : [],
        type: "video.other",
        siteName: "ReelMagic",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: image ? [image] : [],
      },
    };
  } catch {
    return { title: "Video — ReelMagic" };
  }
}

// ─── Page ────────────────────────────────────────────────────

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch server-side for initial render
  let videoData = null;

  try {
    const supabase = createServerClient();
    const { data: job } = await supabase
      .from("video_jobs")
      .select("*")
      .eq("id", id)
      .eq("status", "completed")
      .single();
    if (job) videoData = job;
  } catch {}

  if (!videoData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a1a]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Video Not Found</h1>
          <p className="text-gray-400">This video may have been removed or the link is invalid.</p>
          <a
            href="/"
            className="mt-4 inline-block text-purple-400 hover:text-purple-300"
          >
            Create your own →
          </a>
        </div>
      </div>
    );
  }

  return <WatchClient videoId={id} initialData={videoData} />;
}
