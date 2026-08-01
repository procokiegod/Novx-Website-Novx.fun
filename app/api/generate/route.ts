import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runPipeline } from '@/lib/ai/pipeline';
import { prisma } from '@/lib/prisma';
import { FREE_PLAN_LIMIT, MC_VERSIONS, PLATFORMS, JAVA_VERSIONS, DIFFICULTIES } from '@/lib/constants';
import { validatePrompt, sanitizePrompt } from '@/lib/security';
import type { ProjectOptions } from '@/lib/types';

const MAX_PROMPT_LENGTH = 5000;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, options, name } = body as { prompt: string; options: ProjectOptions; name: string };

    // Input validation
    if (!prompt || prompt.trim().length < 10) {
      return NextResponse.json({ error: 'Prompt must be at least 10 characters' }, { status: 400 });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json({ error: `Prompt must be under ${MAX_PROMPT_LENGTH} characters` }, { status: 400 });
    }

    // Validate options
    if (options) {
      if (!PLATFORMS.includes(options.platform as any)) {
        return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
      }
      if (!MC_VERSIONS.includes(options.mcVersion as any)) {
        return NextResponse.json({ error: 'Invalid Minecraft version' }, { status: 400 });
      }
      if (!JAVA_VERSIONS.includes(options.javaVersion as any)) {
        return NextResponse.json({ error: 'Invalid Java version' }, { status: 400 });
      }
      if (!DIFFICULTIES.includes(options.difficulty as any)) {
        return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
      }
    }

    // Sanitize prompt to prevent injection
    const cleanPrompt = sanitizePrompt(prompt);

    const profile = await prisma.profile.findUnique({ where: { id: user.id } });
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check daily usage for free plan
    if (profile.plan === 'free') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const usage = await prisma.usageCounter.findUnique({
        where: { userId_date: { userId: user.id, date: today } },
      });

      if (usage && usage.count >= FREE_PLAN_LIMIT) {
        return NextResponse.json(
          { error: 'Daily generation limit reached. Upgrade to Pro for unlimited generations.' },
          { status: 429 }
        );
      }
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: name || options?.pluginName || 'Untitled Plugin',
        prompt: cleanPrompt,
        options: options as any,
        status: 'generating',
        difficulty: options?.difficulty || 'standard',
      },
    });

    // Run AI pipeline
    const result = await runPipeline(cleanPrompt, options || {
      platform: 'Paper',
      mcVersion: '1.21',
      javaVersion: '21',
      pluginName: 'NovxPlugin',
      packageName: 'com.novx.plugin',
      mainClass: 'NovxPlugin',
      difficulty: 'Standard',
    });

    // Save spec
    await prisma.project.update({
      where: { id: project.id },
      data: { spec: result.spec as any, status: 'generated', description: result.spec.description },
    });

    // Save files
    await prisma.projectFile.createMany({
      data: result.files.map((f) => ({
        projectId: project.id,
        path: f.path,
        content: f.content,
        language: f.language,
      })),
    });

    // Increment usage counter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.usageCounter.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      create: { userId: user.id, date: today, count: 1 },
      update: { count: { increment: 1 } },
    });

    // Decrement credits for free plan
    if (profile.plan === 'free' && profile.creditsRemaining > 0) {
      await prisma.profile.update({
        where: { id: user.id },
        data: { creditsRemaining: { decrement: 1 } },
      });
    }

    return NextResponse.json({ projectId: project.id, spec: result.spec, stages: result.stages });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
