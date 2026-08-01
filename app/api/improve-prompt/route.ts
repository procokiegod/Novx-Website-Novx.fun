import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { improvePrompt } from '@/lib/ai/pipeline';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { prompt } = await req.json();
    if (!prompt || prompt.trim().length < 5) {
      return NextResponse.json({ error: 'Prompt too short' }, { status: 400 });
    }

    const improved = await improvePrompt(prompt);
    return NextResponse.json({ improved });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to improve prompt' }, { status: 500 });
  }
}
