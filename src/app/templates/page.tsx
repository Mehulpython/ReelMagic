import { TemplateGallery } from "@/components/TemplateGallery";

export const metadata = {
  title: "Templates — ReelMagic",
  description: "Browse and pick from curated video ad templates.",
};

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          Template <span className="gradient-text">Gallery</span>
        </h1>
        <p className="mt-3 text-lg text-gray-400">
          Pick a proven format, customize it to your brand, and generate in seconds.
        </p>
      </div>

      {/* Gallery */}
      <TemplateGallery />
    </div>
  );
}
