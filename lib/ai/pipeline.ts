import { planPlugin, generateAISourceFiles } from './planner';
import { generateAllFiles } from './generators';
import { getAIProvider } from './provider';
import type { AIProviderMessage, PluginSpec, ProjectOptions, SpecFile, ChatModification } from '@/lib/types';

export interface PipelineStage {
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  message?: string;
}

export interface PipelineResult {
  spec: PluginSpec;
  files: SpecFile[];
  stages: PipelineStage[];
}

export async function runPipeline(
  prompt: string,
  options: ProjectOptions,
  onStage?: (stages: PipelineStage[]) => void
): Promise<PipelineResult> {
  const stages: PipelineStage[] = [
    { name: 'AI Planner', status: 'pending' },
    { name: 'Generate Structure', status: 'pending' },
    { name: 'Generate Java', status: 'pending' },
    { name: 'Generate plugin.yml', status: 'pending' },
    { name: 'Generate config.yml', status: 'pending' },
    { name: 'Generate permissions', status: 'pending' },
    { name: 'Generate README', status: 'pending' },
    { name: 'Create Maven project', status: 'pending' },
  ];

  const update = (name: string, status: PipelineStage['status'], message?: string) => {
    const stage = stages.find((s) => s.name === name);
    if (stage) {
      stage.status = status;
      stage.message = message;
    }
    onStage?.([...stages]);
  };

  // Stage 1: AI Planner
  update('AI Planner', 'running');
  const spec = await planPlugin(prompt, options);
  update('AI Planner', 'done');

  // Stage 2: Generate structure (template-based files as baseline)
  update('Generate Structure', 'running');
  const templateFiles = generateAllFiles(spec, options);
  update('Generate Structure', 'done');

  // Stage 3: Generate Java via AI (attempt to get richer source files)
  update('Generate Java', 'running');
  let javaFiles: SpecFile[] = [];
  try {
    javaFiles = await generateAISourceFiles(spec, options);
  } catch {
    // If AI generation of source files fails, use template files
  }
  update('Generate Java', 'done');

  // Merge: prefer AI-generated Java files, fall back to template files for non-Java
  const allFiles: SpecFile[] = [];
  const javaPaths = new Set(javaFiles.map((f) => f.path));
  for (const f of javaFiles) allFiles.push(f);
  for (const f of templateFiles) {
    if (!javaPaths.has(f.path)) allFiles.push(f);
  }

  // Stages 4-7: Mark config/resource stages as done
  update('Generate plugin.yml', 'done');
  update('Generate config.yml', 'done');
  update('Generate permissions', 'done');
  update('Generate README', 'done');

  // Stage 8: Maven project
  update('Create Maven project', 'running');
  update('Create Maven project', 'done');

  return { spec, files: allFiles, stages };
}

export async function improvePrompt(prompt: string): Promise<string> {
  const provider = getAIProvider();
  const messages: AIProviderMessage[] = [
    {
      role: 'system',
      content: 'You are a prompt engineer. Improve the user\'s Minecraft plugin description to be more specific, detailed, and actionable. Add details about commands, permissions, config options, and edge cases. Return ONLY the improved prompt text, no explanation.',
    },
    { role: 'user', content: prompt },
  ];
  return provider.generate(messages, { temperature: 0.5, maxTokens: 1024 });
}

export async function chatModify(
  userMessage: string,
  spec: PluginSpec,
  files: SpecFile[]
): Promise<{ response: string; modifications: ChatModification[] }> {
  const provider = getAIProvider();
  const fileContext = files.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n');

  const systemPrompt = `You are an expert Minecraft plugin developer. The user has an existing plugin project and wants to modify it.

Current plugin spec:
${JSON.stringify(spec, null, 2)}

Current files:
${fileContext}

The user wants: ${userMessage}

Respond with a JSON array of file modifications. Each modification has:
- "file": the file path
- "action": "create", "update", or "delete"
- "content": the new full file content (for create/update)
- "description": a short description of what changed

Return ONLY a JSON array, no markdown or explanation. Example:
[{"file":"src/main/java/.../NovxPlugin.java","action":"update","content":"...","description":"Added cooldown"}]`;

  const messages: AIProviderMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const response = await provider.generate(messages, { temperature: 0.3, maxTokens: 8192 });
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const modifications = JSON.parse(cleaned) as ChatModification[];
    return { response: `Applied ${modifications.length} modification(s) to your project.`, modifications };
  } catch {
    return { response, modifications: [] };
  }
}

export async function fixCodeWithErrors(
  files: SpecFile[],
  compilerErrors: string,
  spec: PluginSpec
): Promise<SpecFile[]> {
  const provider = getAIProvider();
  const fileContext = files.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n');

  const systemPrompt = `You are an expert Java developer. The following Minecraft plugin code has compilation errors. Fix ALL errors and return the corrected files.

Compiler errors:
${compilerErrors}

Plugin spec:
${JSON.stringify(spec, null, 2)}

Current files:
${fileContext}

Return ONLY a JSON array of corrected files with their full content:
[{"path":"src/main/java/...","content":"...","language":"java"}]`;

  const messages: AIProviderMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Fix all compilation errors and return the corrected files.' },
  ];

  const response = await provider.generate(messages, { temperature: 0.1, maxTokens: 8192 });
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned) as SpecFile[];
  } catch {
    return files;
  }
}

export async function explainCode(filePath: string, code: string): Promise<string> {
  const provider = getAIProvider();
  const messages: AIProviderMessage[] = [
    {
      role: 'system',
      content: 'You are an expert Java developer. Explain the following Minecraft plugin code clearly and concisely. Focus on what it does, how it works, and any notable patterns.',
    },
    { role: 'user', content: `File: ${filePath}\n\n${code}` },
  ];
  return provider.generate(messages, { temperature: 0.3, maxTokens: 2048 });
}

export async function fixBugs(filePath: string, code: string): Promise<string> {
  const provider = getAIProvider();
  const messages: AIProviderMessage[] = [
    {
      role: 'system',
      content: 'You are an expert Java developer. Fix any bugs in the following Minecraft plugin code. Return ONLY the fixed code, no explanation.',
    },
    { role: 'user', content: `File: ${filePath}\n\n${code}` },
  ];
  return provider.generate(messages, { temperature: 0.2, maxTokens: 4096 });
}

export async function optimizeCode(filePath: string, code: string): Promise<string> {
  const provider = getAIProvider();
  const messages: AIProviderMessage[] = [
    {
      role: 'system',
      content: 'You are an expert Java developer. Optimize the following Minecraft plugin code for performance and readability. Return ONLY the optimized code, no explanation.',
    },
    { role: 'user', content: `File: ${filePath}\n\n${code}` },
  ];
  return provider.generate(messages, { temperature: 0.2, maxTokens: 4096 });
}
