/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // R2 public URL (CDN)
      { protocol: "https", hostname: process.env.R2_PUBLIC_URL?.replace("https://", "").split("/")[0] || "localhost" },
      // Supabase storage
      { protocol: "https", hostname: "*.supabase.co" },
      // fal.ai generated images
      { protocol: "https", hostname: "*.fal.media" },
      // Replicate output
      { protocol: "https", hostname: "*.replicate.delivery" },
      // ElevenLabs audio
      { protocol: "https", hostname: "*.elevenlabs.io" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://clerk.*.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob: https:",
              "connect-src 'self' https://api.stripe.com https://*.supabase.co https://*.upstash.io https://*.elevenlabs.io https://fal.run https://api.replicate.com",
              "frame-src https://js.stripe.com https://clerk.*.com",
              "font-src 'self'",
            ].join("; "),
          },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
