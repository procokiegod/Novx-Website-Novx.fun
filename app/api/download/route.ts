import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import JSZip from 'jszip';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const projectId = req.nextUrl.searchParams.get('projectId');
    const type = req.nextUrl.searchParams.get('type') || 'zip';

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId' },
        { status: 400 }
      );
    }

    if (type !== 'jar' && type !== 'zip') {
      return NextResponse.json(
        { error: 'Invalid download type' },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        files: true,
        builds: {
          where: {
            status: 'success',
          },
          orderBy: {
            startedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!project || project.userId !== user.id) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    /*
     * Generate a real source ZIP directly from the saved project files.
     */
    if (type === 'zip') {
      if (project.files.length === 0) {
        return NextResponse.json(
          { error: 'No project files found' },
          { status: 404 }
        );
      }

      const zip = new JSZip();

      for (const file of project.files) {
        zip.file(file.path, file.content);
      }

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 9,
        },
      });

      const safeProjectName =
        project.name
          .replace(/[^a-zA-Z0-9_-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || 'minecraft-plugin';

      return new Response(zipBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${safeProjectName}-source.zip"`,
          'Content-Length': String(zipBuffer.length),
          'Cache-Control': 'no-store',
        },
      });
    }

    /*
     * JAR downloads require a successful build.
     */
    const build = project.builds[0];

    if (!build?.jarPath) {
      return NextResponse.json(
        { error: 'No successful JAR build found' },
        { status: 404 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        '[download] Missing Supabase admin environment variables'
      );

      return NextResponse.json(
        { error: 'Storage service is not configured' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createAdminClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    /*
     * Important:
     * The worker uploaded the object using a path that already starts with
     * "builds/" inside the "builds" bucket, so do NOT remove that prefix.
     */
    const storagePath = build.jarPath.replace(/^\/+/, '');

    console.log('[download] Project ID:', projectId);
    console.log('[download] Database JAR path:', build.jarPath);
    console.log('[download] Storage JAR path:', storagePath);

    const { data, error } = await supabaseAdmin.storage
      .from('builds')
      .createSignedUrl(storagePath, 3600, {
        download: true,
      });

    if (error || !data?.signedUrl) {
      console.error(
        '[download] Failed to create signed JAR URL:',
        error
      );

      return NextResponse.json(
        {
          error: 'JAR file is not available in storage',
          details: error?.message || 'Signed URL was not returned',
          path: storagePath,
        },
        { status: 404 }
      );
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    console.error('[download] Unexpected error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Download failed',
      },
      { status: 500 }
    );
  }
}