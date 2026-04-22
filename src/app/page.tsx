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

      {/* Featured Templates Section */}
      <section className="relative px-6 py-24 sm:px-8 lg:px-12">
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
    </div>
  );
}
