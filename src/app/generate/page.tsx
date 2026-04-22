import { GenerateForm } from "@/components/GenerateForm";

export const metadata = {
  title: "Generate — ReelMagic",
  description: "Create AI-powered video ads from your ideas.",
};

export default function GeneratePage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          Generation <span className="gradient-text">Workspace</span>
        </h1>
        <p className="mt-2 text-gray-400">
          Describe your video, choose a template and style, then let AI do the rest.
        </p>
      </div>

      {/* Form + Preview */}
      <GenerateForm />
    </div>
  );
}
