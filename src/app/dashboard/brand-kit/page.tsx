"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Palette, Upload, Save, RotateCcw, Eye, Image } from "lucide-react";
import Link from "next/link";

interface BrandConfig {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontName: string;
  ctaText: string;
  watermarkText: string;
  outroText: string | null;
}

const DEFAULTS: BrandConfig = {
  logoUrl: null,
  primaryColor: "#8B5CF6",
  secondaryColor: "#EC4899",
  fontName: "Inter",
  ctaText: "Learn More",
  watermarkText: "ReelMagic",
  outroText: null,
};

const FONT_OPTIONS = ["Inter", "Roboto", "Montserrat", "Playfair Display", "Oswald", "Poppins", "Lato"];

export default function BrandKitPage() {
  const [config, setConfig] = useState<BrandConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBrand = useCallback(async () => {
    try {
      const res = await fetch("/api/user/brand-kit");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConfig(data.brandConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBrand(); }, [fetchBrand]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/user/brand-kit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof BrandConfig>(key: K, value: BrandConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Brand <span className="gradient-text">Kit</span>
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Set your logo, colors, fonts, and defaults. Applied automatically to all generated videos.
          </p>
        </div>
        <Link href="/dashboard" className="btn-secondary text-sm">← Dashboard</Link>
      </div>

      {/* Preview Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 overflow-hidden rounded-2xl border border-white/10"
        style={{ background: `linear-gradient(135deg, ${config.primaryColor}20, ${config.secondaryColor}20)` }}
      >
        <div className="flex items-center gap-4 px-6 py-4">
          {config.logoUrl ? (
            <img src={config.logoUrl} alt="Logo" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <Image className="h-5 w-5 text-gray-500" />
            </div>
          )}
          <div className="flex-1">
            <p style={{ color: config.primaryColor, fontFamily: config.fontName, fontWeight: 700 }}>
              Your Brand Name
            </p>
            <p style={{ fontFamily: config.fontName }} className="text-sm text-gray-400">
              Video preview with your branding
            </p>
          </div>
          <button
            className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg"
            style={{ backgroundColor: config.primaryColor }}
          >
            {config.ctaText}
          </button>
        </div>
      </motion.div>

      {/* Form */}
      <div className="space-y-6">
        {/* Logo Upload */}
        <fieldset className="glass-card p-6 space-y-4">
          <legend className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
            <Upload className="h-4 w-4 text-purple-400" /> Logo
          </legend>

          <div className="flex items-center gap-4">
            {config.logoUrl ? (
              <div className="relative group">
                <img src={config.logoUrl} alt="Logo" className="h-16 w-16 rounded-xl object-cover" />
                <button
                  onClick={() => update("logoUrl", null)}
                  className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-white/20 hover:border-purple-500/50 transition-colors">
                <Upload className="h-5 w-5 text-gray-500" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // For now, create a local preview URL. In production, upload to R2.
                    update("logoUrl", URL.createObjectURL(file));
                  }}
                />
              </label>
            )}

            <div className="flex-1">
              <p className="text-sm text-gray-300">Upload your logo</p>
              <p className="text-xs text-gray-600">PNG, JPG or SVG. Recommended: 200×200px minimum.</p>
              {config.logoUrl && (
                <button
                  onClick={() => update("logoUrl", null)}
                  className="mt-1 text-xs text-red-400 hover:text-red-300"
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>
        </fieldset>

        {/* Colors */}
        <fieldset className="glass-card p-6 space-y-4">
          <legend className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
            <Palette className="h-4 w-4 text-purple-400" /> Colors
          </legend>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                />
                <input
                  type="text"
                  value={config.primaryColor}
                  onChange={(e) => /^#[0-9a-fA-F]{6}$/.test(e.target.value) && update("primaryColor", e.target.value.toUpperCase())}
                  className="input-dark flex-1 text-sm font-mono uppercase"
                  maxLength={7}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.secondaryColor}
                  onChange={(e) => update("secondaryColor", e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                />
                <input
                  type="text"
                  value={config.secondaryColor}
                  onChange={(e) => /^#[0-9a-fA-F]{6}$/.test(e.target.value) && update("secondaryColor", e.target.value.toUpperCase())}
                  className="input-dark flex-1 text-sm font-mono uppercase"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        </fieldset>

        {/* Typography & Text */}
        <fieldset className="glass-card p-6 space-y-4">
          <legend className="text-sm font-semibold text-white mb-2">Typography & Text</legend>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Font Family</label>
              <select
                value={config.fontName}
                onChange={(e) => update("fontName", e.target.value)}
                className="input-dark w-full"
                style={{ fontFamily: config.fontName }}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">CTA Button Text</label>
              <input
                type="text"
                value={config.ctaText}
                onChange={(e) => update("ctaText", e.target.value)}
                className="input-dark w-full"
                maxLength={50}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Watermark Text</label>
            <input
              type="text"
              value={config.watermarkText}
              onChange={(e) => update("watermarkText", e.target.value)}
              className="input-dark w-full"
              placeholder="Shown on video exports"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Outro / End Screen Text</label>
            <input
              type="text"
              value={config.outroText || ""}
              onChange={(e) => update("outroText", e.target.value || null)}
              className="input-dark w-full"
              placeholder='e.g., "Subscribe for more!"'
              maxLength={200}
            />
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!error && saved && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm text-green-400 flex items-center gap-1"
            >
              ✓ Brand kit saved!
            </motion.div>
          )}
          {!error && !saved && <div />}

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => { setConfig(DEFAULTS); setSaved(false); }}
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-400 hover:bg-white/5"
            >
              <RotateCcw className="mr-1 inline h-3.5 w-3.5" /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Brand Kit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
