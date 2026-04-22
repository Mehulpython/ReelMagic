# ReelMagic — AI Video Ad Generator

> Turn ideas into viral video ads in seconds. AI-powered video generation for memes, political ads, product promos, and more.

## 🎬 Overview

ReelMagic is a full-stack SaaS platform that generates professional video ads using AI. Users describe their vision, pick a template, and get a rendered video — complete with AI-generated visuals, voiceover, music, and effects.

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Animations | Framer Motion |
| Icons | Lucide React |
| Video Gen | fal.AI (images), Replicate (video models) |
| Audio | ElevenLabs (voice), Suno (music) |
| Assembly | FFmpeg (video composition) |
| Backend API | FastAPI (Python) |
| Database | PostgreSQL |
| Storage | S3 / Cloudflare R2 |
| Payments | Stripe |
| Validation | Zod |

## 📁 Project Structure

```
reelmagic/
├── src/
│   ├── app/              # Next.js App Router pages & API routes
│   ├── components/       # React UI components
│   ├── lib/              # Client wrappers, types, pipeline logic
│   └── styles/           # Fonts & additional styles
├── public/               # Static assets
└── docs/                 # Architecture & design docs
```

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env vars
cp .env.example .env
# Fill in your API keys in .env

# 3. Run dev server
npm run dev

# 4. Open http://localhost:3000
```

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      NEXT.JS FRONTEND                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Landing  │  │ Generate │  │Templates │  │ Pricing  │ │
│  │   Page    │  │Workspace │  │ Gallery  │  │   Page   │ │
│  └──────────┘  └────┬─────┘  └──────────┘  └──────────┘ │
│                      │ POST /api/generate                 │
└──────────────────────┼───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND                        │
│  ┌──────────────────────────────────────────────────┐    │
│  │              PIPELINE ORCHESTRATOR                │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐            │    │
│  │  │  Script  │→│ Visual  │→│  Audio  │            │    │
│  │  │   Gen    │ │   Gen   │ │   Gen   │            │    │
│  │  └─────────┘ └────┬────┘ └────┬────┘            │    │
│  │                    │            │                  │    │
│  │                    ▼            ▼                  │    │
│  │              ┌──────────────────────┐              │    │
│  │              │    FFmpeg Assembly   │              │    │
│  │              └──────────┬───────────┘              │    │
│  │                         │                          │    │
│  │                         ▼                          │    │
│  │              ┌──────────────────────┐              │    │
│  │              │   S3 / R2 Storage    │              │    │
│  │              └──────────────────────┘              │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │  fal.AI  │  │Replicate │  │ElevenLabs│  │  Suno   │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │
│                                                          │
│  ┌──────────┐  ┌──────────┐                              │
│  │  Stripe  │  │PostgreSQL│                              │
│  └──────────┘  └──────────┘                              │
└──────────────────────────────────────────────────────────┘
```

## 📄 License

Proprietary — All rights reserved.
