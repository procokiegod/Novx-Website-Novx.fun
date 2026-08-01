import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { chatModify } from '@/lib/ai/pipeline';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { projectId, message } = await req.json();
    if (!projectId || !message) {
      return NextResponse.json({ error: 'Missing projectId or message' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { files: true },
    });

    if (!project || project.userId !== user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Save user message
    await prisma.message.create({
      data: { projectId, userId: user.id, role: 'user', content: message },
    });

    const spec = (project.spec as any) || {};
    const result = await chatModify(message, spec, project.files);

    // Apply modifications
    for (const mod of result.modifications) {
      if (mod.action === 'delete') {
        await prisma.projectFile.deleteMany({
          where: { projectId, path: mod.file },
        });
      } else {
        await prisma.projectFile.upsert({
          where: { projectId_path: { projectId, path: mod.file } },
          create: { projectId, path: mod.file, content: mod.content || '', language: detectLanguage(mod.file) },
          update: { content: mod.content || '' },
        });
      }
    }

    // Save assistant message
    await prisma.message.create({
      data: {
        projectId,
        userId: user.id,
        role: 'assistant',
        content: result.response,
        appliedChanges: result.modifications as any,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}

function detectLanguage(path: string): string {
  if (path.endsWith('.java')) return 'java';
  if (path.endsWith('.yml') || path.endsWith('.yaml')) return 'yaml';
  if (path.endsWith('.xml')) return 'xml';
  if (path.endsWith('.md')) return 'markdown';
  return 'text';
}
