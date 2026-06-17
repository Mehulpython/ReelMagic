import { Hero } from "@/components/Hero";
import { TemplateCard } from "@/components/TemplateCard";

const FEATURED_TEMPLATES = [
  {
    id: "skibidi-reaction",
    name: "Skibidi Reaction",
    description: "Viral reaction-style video with dynamic cuts and trending audio.",
    gradient: "from-purple-600 via-pink-500 to-red-500",
  },
  {
    id: "product-launch",
    name: "Product Launch",
    description: "Sleek product showcase with cinematic transitions and CTA overlay.",
    gradient: "from-blue-600 via-cyan-500 to-teal-400",
  },
  {
    id: "political-meme",
    name: "Political Meme",
    description: "Attention-grabbing political content with bold text and fast pacing.",
    gradient: "from-amber-500 via-orange-500 to-red-600",
  },
];

export default function HomePage() {
  return (
    <div>
      <Hero />

      {/* How It Works */}
      <section className="relative px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-white sm:text-4xl">
              Three steps to a{" "}
              <span className="gradient-text">finished video</span>
            </h2>
            <p className="text-lg text-gray-400">
              No editing skills required. No software to download.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600/20 border border-primary-500/30">
                <span className="text-2xl">✍️</span>
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-primary-400 mb-2">Step 1</div>
              <h3 className="text-lg font-semibold text-white mb-2">Describe your vision</h3>
              <p className="text-sm text-gray-400">
                Type your script or pick a template. &ldquo;30-second ad for a new coffee brand targeting college students.&rdquo;
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/20 border border-accent-500/30">
                <span className="text-2xl">🎨</span>
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-accent-400 mb-2">Step 2</div>
              <h3 className="text-lg font-semibold text-white mb-2">AI does the work</h3>
              <p className="text-sm text-gray-400">
                Visuals, voiceover, background music, captions, and effects — all generated automatically in 60 seconds.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/20 border border-green-500/30">
                <span className="text-2xl">🚀</span>
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-green-400 mb-2">Step 3</div>
              <h3 className="text-lg font-semibold text-white mb-2">Download & share</h3>
              <p className="text-sm text-gray-400">
                Get a finished MP4 ready for TikTok, Instagram, YouTube, or any platform. No watermark on paid plans.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Templates Section */}
      <section className="relative px-6 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Start with a Template
            </h2>
            <p className="text-lg text-gray-400">
              Pick a proven format and customize it to your brand in seconds.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_TEMPLATES.map((template) => (
              <TemplateCard key={template.id} {...template} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <a
              href="/templates"
              className="btn-secondary inline-flex items-center gap-2 text-lg"
            >
              Browse All Templates →
            </a>
          </div>
        </div>
      </section>

      {/* Stats / Social Proof */}
      <section className="border-y border-white/5 bg-white/[0.02] py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
            <div>
              <div className="text-3xl font-bold text-white">60s</div>
              <div className="text-sm text-gray-500">Avg generation time</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">8</div>
              <div className="text-sm text-gray-500">Languages</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">6</div>
              <div className="text-sm text-gray-500">Templates</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">1080p</div>
              <div className="text-sm text-gray-500">Max resolution</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Ready to go{" "}
            <span className="gradient-text">viral</span>?
          </h2>
          <p className="mb-8 text-lg text-gray-400">
            Join creators using ReelMagic to generate video ads that convert. Free to start.
          </p>
          <a href="/generate" className="btn-primary inline-flex items-center gap-2 text-lg">
            Create Your First Video →
          </a>
        </div>
      </section>
    </div>
  );
}
