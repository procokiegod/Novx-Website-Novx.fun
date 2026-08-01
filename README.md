# NOVX AI

Create Minecraft plugins with AI. Describe your plugin in plain English, and NOVX AI generates, compiles, and packages a ready-to-use Paper plugin.

## Features

- AI-powered plugin generation (OpenAI, Anthropic, Gemini, OpenRouter)
- Docker-sandboxed Maven compilation with automatic error retry
- Monaco code editor with AI-assisted modifications
- AI chat to add features, fix bugs, and optimize
- Public marketplace with ratings and comments
- Supabase authentication (email, Google, GitHub)
- Stripe subscriptions (Free + Pro)
- Dark/light theme, responsive design, PWA support

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your keys (Supabase is pre-configured).

3. Generate the Prisma client:
```bash
npx prisma generate
```

4. Run the dev server:
```bash
npm run dev
```

## AI Provider Configuration

Set `AI_PROVIDER` in `.env` to one of: `openai`, `anthropic`, `gemini`, `openrouter`, or `mock`.

Add the corresponding API key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.).

Without keys, the app uses a mock provider that returns sample output for local development.

## Compilation Worker

The compilation worker runs Maven in an isolated Docker container. It is separate from the main app so it can be deployed to a VPS/Fly.io/Render instead of Vercel.

To run the worker locally:
```bash
cd worker
docker build -t novx-worker .
docker run -p 3001:3001 -v /var/run/docker.sock:/var/run/docker.sock novx-worker
```

Set `WORKER_URL=http://localhost:3001` in your `.env`.

Without a worker, the app returns a simulated build result.

## Stripe Configuration

1. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_PRO`, and `STRIPE_WEBHOOK_SECRET` in `.env`.
2. Set the webhook endpoint to `https://your-domain.com/api/stripe/webhook`.
3. Create a Pro subscription product in Stripe Dashboard and copy the price ID.

## Deployment

### Frontend (Vercel)
- Push to GitHub and import to Vercel.
- Set all environment variables in Vercel project settings.

### Worker (VPS/Fly.io/Render)
- Deploy the `worker/` directory.
- Set `WORKER_URL` on Vercel to the worker's public URL.

## Tech Stack

- Next.js 15 (App Router), React, TypeScript
- Tailwind CSS, shadcn/ui, Framer Motion
- Supabase (Auth, Database, Storage)
- Prisma ORM
- Stripe
- Monaco Editor
- Docker (compilation sandbox)
