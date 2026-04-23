# ReelMagic — Implementation Plan

## Overview
AI-powered video ad generation SaaS. Users pick a template, enter a script, and the system generates viral-style short video ads.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│  Next.js 14 │────▶│   BullMQ     │────▶│  Worker   │
│  Frontend   │     │   (Redis)    │     │  Process  │
│  + API      │◀────│   Queue      │◀────│  (separate│
│  Routes     │ SSE │              │     │   tsx)    │
└──────┬──────┘     └──────────────┘     └─────┬─────┘
       │                                       │
       │          ┌────────────────┐           │
       ├─────────▶│  Supabase DB   │◀──────────┤
       │          │  (profiles,    │           │
       │          │   videos,      │           │
       │          │   credits)     │           │
       │          └────────────────┘           │
       │                                       │
       │          ┌────────────────┐           │
       ├─────────▶│  Cloudflare R2 │◀──────────┤
       │          │  (video/mp4,   │           │
       │          │   audio, thumbs)│          │
       │          └────────────────┘           │
       │                                       ▼
       │          ┌────────────────────────────────────┐
       │          │  AI APIs:                           │
       │          │  • fal.AI (FLUX 2 + Kling video)   │
       │          │  • Replicate (CogVideoX fallback)   │
       │          │  • ElevenLabs (voiceover TTS)       │
       │          │  • Suno / fal Stable Audio (BGM)    │
       │          └────────────────────────────────────┘
       │
       │          ┌────────────────┐
       ├─────────▶│  Clerk v5      │
       │          │  (auth)        │
       │          └────────────────┘
       │
       │          ┌────────────────┐
       └─────────▶│  Stripe        │
                  │  (billing)     │
                  └────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 (App Router) | Pages, API routes, SSE |
| Styling | Tailwind CSS + Framer Motion | Dark theme, purple accent |
| Auth | Clerk v5 | Sign-in, sign-up, webhooks |
| Database | Supabase (PostgreSQL) | Users, videos, credits |
| Queue | BullMQ + ioredis | Job queue with priorities |
| Storage | Cloudflare R2 | Videos, thumbnails, audio |
| Payments | Stripe | Subscriptions + credit packs |
| Rate Limit | Upstash Redis | Per-plan rate limiting |

## AI Services

| Service | Model | Use | Cost |
|---------|-------|-----|------|
| fal.AI | FLUX 2 schnell/pro | Keyframe image gen | ~$0.003/img |
| fal.AI | Kling v1/v2 | Image-to-video | ~$0.10/sec |
| Replicate | CogVideoX | Fallback video gen | ~$0.06/sec |
| ElevenLabs | multilingual_v2 | Voiceover TTS | ~$0.01/char |
| Suno/fal | Stable Audio | Background music | ~$0.02/gen |

## Video Generation Pipeline (8 steps)

```
1. Analyze     → Parse script, build enhanced prompt with style
2. Keyframe    → FLUX 2 generates scene image (576x1024 or 1024x576)
3. Video       → Kling v1 animates image → 5-10s video (fallback: CogVideoX)
4. Voiceover   → ElevenLabs TTS generates narration audio
5. BGM         → Suno/fal Stable Audio generates background music
6. Assemble    → FFmpeg stitches: video + voiceover + BGM + captions + watermark
7. Upload      → Upload final MP4 + thumbnail to Cloudflare R2
8. Finalize    → Calculate cost, return result to user via SSE
```

## Routes (16 total)

### Pages (7)
| Route | Purpose |
|-------|---------|
| `/` | Landing page with hero + featured templates |
| `/generate` | Video creation workspace (form + live preview) |
| `/templates` | Template gallery (6 templates) |
| `/pricing` | 3-tier pricing (Free/$29/$99) |
| `/dashboard` | User dashboard (stats, recent videos) |
| `/sign-in` | Clerk sign-in |
| `/sign-up` | Clerk sign-up |

### API Routes (9)
| Route | Purpose |
|-------|---------|
| `POST /api/generate` | Submit video generation job |
| `GET /api/status/[id]` | Poll job status |
| `GET /api/stream/[id]` | SSE real-time progress |
| `GET /api/templates` | List template definitions |
| `GET /api/health` | Queue stats + health check |
| `POST /api/billing` | Stripe checkout/portal/credits |
| `POST /api/webhooks/clerk` | User creation webhook |
| `POST /api/webhooks/stripe` | Payment/billing events |

## Templates

| ID | Name | Style | BGM Preset |
|----|------|-------|------------|
| skibidi-reaction | Skibidi Reaction | Viral, dynamic cuts | Electronic trap |
| democrat-ad | Democrat Ad | Clean, hopeful, patriotic | Orchestral cinematic |
| product-launch | Product Launch | Sleek, cinematic, CTA | Synthwave pop |
| beauty-influencer | Beauty Influencer | Glamorous, soft transitions | Lo-fi ambient |
| political-meme | Political Meme | Bold text, fast-paced | Dramatic tension |
| dropship-ad | Dropship Ad | Urgency, social proof | Electronic dance |

## Environment Variables

```env
# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# AI APIs
FAL_KEY=...
REPLICATE_API_TOKEN=...
ELEVENLABS_API_KEY=...
SUNO_API_KEY=...

# Database
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Storage
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=reelmagic-videos
R2_PUBLIC_URL=https://cdn.reelmagic.ai

# Queue
REDIS_URL=redis://localhost:6379

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_MONTHLY_PRICE_ID=price_...
STRIPE_STARTER_YEARLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...

# Rate Limiting
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Running

```bash
# Install
npm install

# Development
npm run dev

# Worker (separate terminal)
npx tsx src/worker.ts

# Production build
npm run build
npm start
```

## Deployment

| Service | Provider | Notes |
|---------|----------|-------|
| Frontend + API | Vercel | Auto-deploy from GitHub |
| Worker | Railway / Render | Runs `npx tsx src/worker.ts` |
| Redis | Upstash | Free tier for queue |
| Database | Supabase | Free tier |
| Storage | Cloudflare R2 | Free egress |
| Domain | reelmagic.ai | via Vercel |

## File Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page
│   ├── generate/          # Video workspace
│   ├── templates/         # Template gallery
│   ├── pricing/           # Pricing page
│   ├── dashboard/         # User dashboard
│   ├── sign-in/           # Clerk auth
│   ├── sign-up/
│   └── api/               # API routes
│       ├── generate/      # Submit job
│       ├── status/[id]/   # Poll status
│       ├── stream/[id]/   # SSE progress
│       ├── billing/       # Stripe checkout
│       ├── health/        # Queue stats
│       ├── templates/     # Template list
│       └── webhooks/      # Clerk + Stripe
├── components/            # React components
│   ├── GenerateForm.tsx   # Video creation form
│   ├── VideoPreview.tsx   # Live preview + progress
│   ├── TemplateGallery.tsx
│   ├── TemplateCard.tsx
│   ├── PricingCard.tsx
│   ├── Hero.tsx
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── LoadingSpinner.tsx
├── lib/                   # Business logic
│   ├── fal.ts             # fal.AI (FLUX + Kling)
│   ├── replicate.ts       # Replicate (CogVideoX)
│   ├── elevenlabs.ts      # ElevenLabs voiceover
│   ├── suno.ts            # Suno BGM + fal Stable Audio
│   ├── ffmpeg.ts          # Video assembly pipeline
│   ├── pipeline.ts        # 8-step orchestrator
│   ├── worker.ts          # BullMQ worker process
│   ├── queue.ts           # Queue + job types
│   ├── redis.ts           # Redis connection
│   ├── storage.ts         # Cloudflare R2
│   ├── stripe.ts          # Stripe billing
│   ├── rate-limit.ts      # Upstash rate limiting
│   ├── supabase.ts        # DB client
│   ├── db-types.ts        # TypeScript DB types
│   └── types.ts           # Shared types
├── worker.ts              # Standalone worker entry
└── middleware.ts          # Clerk auth middleware
```

## Cost Model

| Plan | Price | Videos/mo | Max Duration | Resolution |
|------|-------|-----------|-------------|------------|
| Free | $0 | 3 | 15s | 720p |
| Starter | $29 | 30 | 60s | 1080p |
| Pro | $99 | Unlimited | 120s | 4K |

Average cost per video: ~$1.00 (10s × $0.10/s)
Average revenue per video: ~$1.50 (blended plan cost)
Gross margin: ~33%
