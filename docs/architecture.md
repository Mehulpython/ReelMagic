# ReelMagic System Architecture

## Overview

ReelMagic is a full-stack AI video ad generation platform. Users describe their vision in natural language, pick a template and style, and receive a rendered, polished video ad — complete with AI-generated visuals, voiceover, music, and effects.

---

## High-Level Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                          │
│                                                               │
│   ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│   │ Landing  │  │ Generate │  │Templates │  │   Pricing   │  │
│   │   Page   │  │Workspace │  │ Gallery  │  │    Page     │  │
│   └─────────┘  └────┬─────┘  └──────────┘  └─────────────┘  │
│                      │                                        │
│               Next.js App Router (SSR + API Routes)           │
└──────────────────────┼────────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌───────────────────────────────────────────────────────────────┐
│                       API GATEWAY LAYER                       │
│                                                               │
│   Next.js API Routes → FastAPI Backend                        │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│   │ POST         │  │ GET          │  │ GET              │   │
│   │ /api/generate│  │ /api/templates│ │ /api/status/[id] │   │
│   └──────┬───────┘  └──────────────┘  └──────────────────┘   │
└──────────┼────────────────────────────────────────────────────┘
           │
           ▼
┌───────────────────────────────────────────────────────────────┐
│                    PIPELINE ORCHESTRATOR                       │
│                    (FastAPI / Python)                          │
│                                                               │
│   ┌─────────────────────────────────────────────────────┐     │
│   │                  Job Queue (Redis)                   │     │
│   └─────────────────────┬───────────────────────────────┘     │
│                         │                                     │
│   ┌──────────┐  ┌──────┴──────┐  ┌──────────┐               │
│   │  Script   │  │   Visual    │  │   Audio   │               │
│   │   Gen     │  │    Gen      │  │    Gen    │               │
│   │ (GPT-4)  │  │             │  │           │               │
│   └──────────┘  └──────┬──────┘  └─────┬─────┘               │
│                        │                │                     │
│                        ▼                ▼                     │
│                  ┌──────────────────────────┐                 │
│                  │     FFmpeg Assembly       │                 │
│                  │  (Video + Audio + FX)     │                 │
│                  └────────────┬──────────────┘                 │
│                               │                               │
│                               ▼                               │
│                  ┌──────────────────────────┐                 │
│                  │    S3 / Cloudflare R2     │                 │
│                  │    (Final video storage)  │                 │
│                  └──────────────────────────┘                 │
│                                                               │
│   ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐     │
│   │ PostgreSQL  │  │    Stripe    │  │   WebSockets    │     │
│   │ (Job state) │  │ (Payments)  │  │ (Status push)   │     │
│   └─────────────┘  └──────────────┘  └─────────────────┘     │
└───────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Frontend — Next.js 14 (App Router)

- **Framework**: Next.js 14 with App Router, React 18, TypeScript
- **Styling**: Tailwind CSS with custom dark theme (purple/amber accents)
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Icons**: Lucide React
- **State**: React hooks + server components where possible

**Pages:**
| Route | Description |
|-------|-------------|
| `/` | Landing page with hero, featured templates, CTA |
| `/generate` | Main workspace — form + live preview |
| `/templates` | Template gallery with filtering |
| `/pricing` | Pricing tiers with Stripe integration |

### 2. Backend API — FastAPI (Python)

The FastAPI backend handles the heavy lifting:

- **Pipeline orchestration**: Coordinates all AI services
- **Job queue**: Redis-backed task queue for async processing
- **Job state**: PostgreSQL stores job metadata, user data, billing
- **WebSockets**: Push real-time progress updates to the frontend

**Key endpoints:**
```
POST /api/v1/jobs          — Create a new video generation job
GET  /api/v1/jobs/{id}     — Get job status and progress
POST /api/v1/webhooks      — Receive callbacks from AI providers
GET  /api/v1/templates     — List available templates
```

### 3. AI Services

#### Image Generation — fal.AI
- **Purpose**: Generate scene visuals, backgrounds, product shots
- **Models**: FLUX Schnell (fast), FLUX Pro (quality), SDXL
- **Flow**: Script analysis → scene descriptions → image prompts → batch generation
- **Config**: Resolution, style, negative prompts per template

#### Video Generation — Replicate
- **Purpose**: Animate images into video clips
- **Models**: MiniMax Video-01, Stable Video Diffusion, Kling Video
- **Flow**: Scene images → image-to-video model → video clips
- **Config**: Duration, motion strength, FPS

#### Voiceover — ElevenLabs
- **Purpose**: Generate voiceover narration from script
- **Models**: Eleven Turbo v2, Eleven Multilingual v2
- **Flow**: Script segments → TTS with selected voice → audio segments
- **Config**: Voice ID, speed, emotion, language

#### Music — Suno
- **Purpose**: Generate background music
- **Models**: Suno v3.5
- **Flow**: Style/mood description → music generation → audio file
- **Config**: Genre, mood, duration, instrumental only

### 4. Video Assembly — FFmpeg

The assembly step combines all assets into the final video:

1. **Concatenate** video clips with transitions (fade, slide, wipe)
2. **Overlay** text (titles, CTAs, captions)
3. **Mix** voiceover + music audio tracks
4. **Encode** to target format (H.264, AAC)
5. **Export** at target resolution and aspect ratio

### 5. Storage — S3 / Cloudflare R2

- **Input assets**: Temporary storage for generated images, audio
- **Output videos**: Final rendered videos served via CDN
- **CDN**: CloudFront or R2 custom domain for fast delivery
- **Lifecycle**: Auto-delete temp assets after 24h, retain outputs per user plan

### 6. Payments — Stripe

- **Integration**: Stripe Checkout for subscriptions
- **Plans**: Free, Starter ($29/mo), Pro ($99/mo)
- **Billing**: Monthly subscription with usage tracking
- **Webhooks**: Handle payment events, plan changes, failures

---

## Data Flow

```
User submits form
       │
       ▼
Next.js API Route validates request
       │
       ▼
FastAPI creates job in PostgreSQL → Returns job ID
       │
       ▼
Redis queue picks up job
       │
       ▼
┌─────────────────── Pipeline Steps ───────────────────┐
│                                                       │
│  1. GPT-4 analyzes script → breaks into scenes        │
│  2. fal.AI generates images for each scene            │
│  3. Replicate animates images into video clips        │
│  4. ElevenLabs generates voiceover                    │
│  5. Suno generates background music                   │
│  6. FFmpeg assembles: video + audio + text + FX       │
│  7. Upload final video to S3/R2                       │
│                                                       │
│  Each step updates progress via Redis → WebSocket     │
└───────────────────────────────────────────────────────┘
       │
       ▼
Frontend receives completion → Shows video player + download
```

---

## Deployment

| Component | Platform |
|-----------|----------|
| Frontend (Next.js) | Vercel |
| Backend (FastAPI) | Railway / AWS ECS |
| Database (PostgreSQL) | Supabase / RDS |
| Queue (Redis) | Upstash / ElastiCache |
| Storage (S3/R2) | Cloudflare R2 |
| CDN | Cloudflare |

---

## Security Considerations

- API keys stored in environment variables, never exposed to client
- Rate limiting on all API endpoints
- User authentication via NextAuth.js (planned)
- Content moderation on generated scripts (OpenAI Moderation API)
- Signed URLs for video downloads (time-limited access)
- Stripe webhook signature verification

---

## Future Improvements

- [ ] Real-time collaborative editing
- [ ] Custom template builder (drag-and-drop)
- [ ] A/B testing for generated ads
- [ ] Multi-language support
- [ ] Brand kit management (logos, colors, fonts)
- [ ] Analytics dashboard for published ads
- [ ] Direct social media publishing
