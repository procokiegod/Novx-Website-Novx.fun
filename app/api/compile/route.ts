import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { fixCodeWithErrors } from '@/lib/ai/pipeline';
import { isAIConfigured } from '@/lib/ai/provider';
import type { BuildResult, SpecFile, PluginSpec } from '@/lib/types';

const MAX_COMPILE_ATTEMPTS = 3;
const WORKER_TIMEOUT_MS = 180_000;

interface WorkerErrorBody {
  error?: string;
  logs?: string;
  details?: unknown;
}

function cleanProjectOptions(
  options: unknown,
  projectName: string
): Record<string, unknown> {
  const rawOptions =
    options && typeof options === 'object' && !Array.isArray(options)
      ? (options as Record<string, unknown>)
      : {};

  const cleanOptions = Object.fromEntries(
    Object.entries(rawOptions).filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string' && value.trim().length === 0) return false;
      return true;
    })
  );

  cleanOptions.pluginName =
    typeof cleanOptions.pluginName === 'string' && cleanOptions.pluginName.trim()
      ? cleanOptions.pluginName.trim()
      : projectName || 'NovxPlugin';

  cleanOptions.mcVersion =
    typeof cleanOptions.mcVersion === 'string' && cleanOptions.mcVersion.trim()
      ? cleanOptions.mcVersion.trim()
      : '1.21.1';

  cleanOptions.javaVersion =
    cleanOptions.javaVersion !== undefined
      ? String(cleanOptions.javaVersion)
      : '21';

  cleanOptions.platform =
    typeof cleanOptions.platform === 'string' && cleanOptions.platform.trim()
      ? cleanOptions.platform.trim()
      : 'Paper';

  return cleanOptions;
}

function parseWorkerError(responseText: string, status: number): string {
  if (!responseText.trim()) return `Worker returned HTTP ${status}`;

  try {
    const parsed = JSON.parse(responseText) as WorkerErrorBody;

    if (parsed.details) {
      return `${parsed.error || 'Worker request failed'}\n${JSON.stringify(
        parsed.details,
        null,
        2
      )}`;
    }

    return parsed.logs || parsed.error || responseText;
  } catch {
    return responseText;
  }
}

function isInfrastructureError(status: number | null, message: string): boolean {
  const normalized = message.toLowerCase();

  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return true;
  }

  return (
    normalized.includes('rate limited') ||
    normalized.includes('too many requests') ||
    normalized.includes('unauthorized worker request') ||
    normalized.includes('worker secret') ||
    normalized.includes('worker_url') ||
    normalized.includes('worker_secret') ||
    normalized.includes('supabase upload failed') ||
    normalized.includes('network') ||
    normalized.includes('fetch failed') ||
    normalized.includes('timed out') ||
    normalized.includes('timeout') ||
    normalized.includes('release version 21 not supported') ||
    normalized.includes('invalid compile request')
  );
}

async function markBuildFailed(
  buildId: string,
  logs: string,
  error: string
): Promise<void> {
  await prisma.build.update({
    where: { id: buildId },
    data: {
      status: 'failed',
      logs,
      error,
      completedAt: new Date(),
    },
  });
}

function mergeFixedFiles(
  currentFiles: SpecFile[],
  fixedFiles: SpecFile[]
): SpecFile[] {
  const merged = new Map<string, SpecFile>();

  for (const file of currentFiles) merged.set(file.path, file);
  for (const file of fixedFiles) merged.set(file.path, file);

  return Array.from(merged.values());
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const requestBody = (await req.json()) as { projectId?: string };
    const projectId = requestBody.projectId?.trim();

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing projectId' },
        { status: 400 }
      );
    }

    const workerUrl = process.env.WORKER_URL?.trim().replace(/\/+$/, '');
    const workerSecret = process.env.WORKER_SECRET?.trim();

    if (!workerUrl) {
      return NextResponse.json(
        { success: false, error: 'WORKER_URL is not configured' },
        { status: 503 }
      );
    }

    if (!workerSecret) {
      return NextResponse.json(
        { success: false, error: 'WORKER_SECRET is not configured' },
        { status: 500 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { files: true },
    });

    if (!project || project.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project has no files to compile' },
        { status: 400 }
      );
    }

    const cleanOptions = cleanProjectOptions(project.options, project.name);

    let currentFiles: SpecFile[] = project.files.map((file) => ({
      path: file.path,
      content: file.content,
      language: file.language || 'text',
    }));

    const spec =
      (project.spec as unknown as PluginSpec | null) || ({} as PluginSpec);

    let allLogs = '';
    let attempts = 0;
    let lastError = 'Compilation failed';

    for (
      let attempt = 1;
      attempt <= MAX_COMPILE_ATTEMPTS;
      attempt += 1
    ) {
      attempts = attempt;

      const build = await prisma.build.create({
        data: {
          projectId,
          userId: user.id,
          attempt,
          status: 'compiling',
          logs: '',
        },
      });

      let result: BuildResult;
      let workerStatus: number | null = null;

      try {
        console.log(
          `[compile] Sending project ${projectId} to ${workerUrl}, attempt ${attempt}`
        );

        const workerResponse = await fetch(`${workerUrl}/compile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${workerSecret}`,
          },
          body: JSON.stringify({
            projectId,
            files: currentFiles,
            options: cleanOptions,
            spec,
          }),
          signal: AbortSignal.timeout(WORKER_TIMEOUT_MS),
          cache: 'no-store',
        });

        workerStatus = workerResponse.status;
        const responseText = await workerResponse.text();

        console.log(
          `[compile] Worker response ${workerResponse.status}:`,
          responseText.slice(0, 4000)
        );

        if (workerResponse.status === 429) {
          const message =
            'Compilation worker is busy. Wait about one minute and try again.';

          await markBuildFailed(
            build.id,
            responseText || 'Worker rate limited',
            message
          );

          return NextResponse.json(
            {
              success: false,
              error: message,
              logs: responseText || 'Worker rate limited',
              attempts: attempt,
            },
            { status: 429 }
          );
        }

        if (
          workerResponse.status === 401 ||
          workerResponse.status === 403
        ) {
          const workerMessage = parseWorkerError(
            responseText,
            workerResponse.status
          );

          await markBuildFailed(build.id, workerMessage, workerMessage);

          return NextResponse.json(
            {
              success: false,
              error:
                'Worker authentication failed. Check that WORKER_SECRET matches Railway.',
              logs: workerMessage,
              attempts: attempt,
            },
            { status: workerResponse.status }
          );
        }

        if (
          workerResponse.status === 502 ||
          workerResponse.status === 503 ||
          workerResponse.status === 504
        ) {
          const workerMessage = parseWorkerError(
            responseText,
            workerResponse.status
          );

          await markBuildFailed(build.id, workerMessage, workerMessage);

          return NextResponse.json(
            {
              success: false,
              error:
                'Compilation worker is temporarily unavailable. Try again shortly.',
              logs: workerMessage,
              attempts: attempt,
            },
            { status: workerResponse.status }
          );
        }

        if (!workerResponse.ok) {
          const workerMessage = parseWorkerError(
            responseText,
            workerResponse.status
          );

          result = {
            success: false,
            error:
              workerMessage ||
              `Worker returned HTTP ${workerResponse.status}`,
            logs:
              workerMessage ||
              `Worker returned HTTP ${workerResponse.status}`,
            attempts: attempt,
          };
        } else {
          try {
            result = JSON.parse(responseText) as BuildResult;
          } catch {
            result = {
              success: false,
              error: 'Worker returned invalid JSON',
              logs: responseText,
              attempts: attempt,
            };
          }
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown worker request error';

        console.error('[compile] Worker request failed:', error);

        result = {
          success: false,
          error: message,
          logs: message,
          attempts: attempt,
        };
      }

      const attemptLogs =
        result.logs || result.error || 'No build logs were returned';

      allLogs += `\n=== Attempt ${attempt} ===\n${attemptLogs}\n`;

      lastError = result.error || result.logs || 'Compilation failed';

      await prisma.build.update({
        where: { id: build.id },
        data: {
          status: result.success ? 'success' : 'failed',
          logs: attemptLogs,
          jarPath: result.jarPath || null,
          zipPath: result.zipPath || null,
          error: result.success ? null : lastError,
          completedAt: new Date(),
        },
      });

      if (result.success) {
        if (!result.jarPath) {
          lastError =
            'Worker reported success but returned no JAR path';

          await prisma.build.update({
            where: { id: build.id },
            data: {
              status: 'failed',
              error: lastError,
            },
          });
        } else {
          if (attempt > 1) {
            for (const file of currentFiles) {
              await prisma.projectFile.upsert({
                where: {
                  projectId_path: {
                    projectId,
                    path: file.path,
                  },
                },
                create: {
                  projectId,
                  path: file.path,
                  content: file.content,
                  language: file.language || 'text',
                },
                update: {
                  content: file.content,
                  language: file.language || 'text',
                },
              });
            }
          }

          await prisma.project.update({
            where: { id: projectId },
            data: { status: 'compiled' },
          });

          return NextResponse.json({
            success: true,
            logs: allLogs,
            jarPath: result.jarPath,
            zipPath: result.zipPath,
            attempts,
          } satisfies BuildResult);
        }
      }

      if (isInfrastructureError(workerStatus, lastError)) {
        console.error(
          '[compile] Infrastructure failure; skipping AI repair:',
          lastError
        );

        await prisma.project.update({
          where: { id: projectId },
          data: { status: 'failed' },
        });

        return NextResponse.json(
          {
            success: false,
            logs: allLogs,
            error: lastError,
            attempts,
          } satisfies BuildResult,
          {
            status:
              workerStatus && workerStatus >= 400
                ? workerStatus
                : 503,
          }
        );
      }

      if (
        attempt < MAX_COMPILE_ATTEMPTS &&
        isAIConfigured()
      ) {
        try {
          const fixedFiles = await fixCodeWithErrors(
            currentFiles,
            lastError,
            spec
          );

          if (fixedFiles.length > 0) {
            currentFiles = mergeFixedFiles(currentFiles, fixedFiles);
          }
        } catch (error) {
          console.error('[compile] AI repair failed:', error);
        }
      }
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'failed' },
    });

    return NextResponse.json(
      {
        success: false,
        logs: allLogs,
        error:
          `Build failed after ${attempts} attempts: ${lastError}`,
        attempts,
      } satisfies BuildResult,
      { status: 422 }
    );
  } catch (error) {
    console.error('[compile] Unexpected compile error:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Compilation failed',
      },
      { status: 500 }
    );
  }
}