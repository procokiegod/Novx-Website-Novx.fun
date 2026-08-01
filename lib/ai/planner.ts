import { getAIProvider } from './provider';
import type { AIProviderMessage, PluginSpec, ProjectOptions, SpecFile } from '@/lib/types';

const SYSTEM_PROMPT = `You are an expert Minecraft plugin architect. Given a user's plugin description and options, create a detailed plugin specification as JSON.

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "name": "PluginName",
  "mainClass": "MainClassName",
  "packageName": "com.example.pluginname",
  "version": "1.0.0",
  "apiVersion": "1.21",
  "author": "NOVX AI",
  "description": "Short description",
  "commands": [{"name": "command", "description": "desc", "usage": "/command", "permission": "perm.node", "aliases": []}],
  "listeners": [{"event": "PlayerJoinEvent", "description": "desc"}],
  "permissions": [{"name": "perm.node", "description": "desc", "default": "true"}],
  "configKeys": [{"key": "path.to.key", "value": "default", "comment": "explanation"}],
  "dependencies": [{"name": "Vault", "groupId": "com.github.MilkBowl", "artifactId": "VaultAPI", "version": "1.7", "optional": true}],
  "files": []
}

Rules:
- Generate real, working command and listener names based on the user's request.
- Include appropriate permissions with sensible defaults.
- Include config keys for all configurable values, especially messages.
- Only add dependencies the plugin actually needs (Vault for economy, PlaceholderAPI for placeholders).
- Keep the spec concise but complete.`;

export async function planPlugin(prompt: string, options: ProjectOptions): Promise<PluginSpec> {
  const provider = getAIProvider();
  const userMessage = `User request: ${prompt}

Options:
- Platform: ${options.platform}
- Minecraft Version: ${options.mcVersion}
- Java Version: ${options.javaVersion}
- Plugin Name: ${options.pluginName || 'NovxPlugin'}
- Package Name: ${options.packageName || 'com.novx.plugin'}
- Main Class: ${options.mainClass || 'NovxPlugin'}
- Difficulty: ${options.difficulty}

Create the plugin specification JSON.`;

  const messages: AIProviderMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];

  const response = await provider.generate(messages, { temperature: 0.3, maxTokens: 4096 });
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const spec = JSON.parse(cleaned) as PluginSpec;

  if (options.pluginName) spec.name = options.pluginName;
  if (options.mainClass) spec.mainClass = options.mainClass;
  if (options.packageName) spec.packageName = options.packageName;
  spec.apiVersion = options.mcVersion;

  return spec;
}

/**
 * Ask the AI to generate complete Java source files for the plugin.
 * The AI returns a JSON array of files with path, content, and language.
 */
export async function generateAISourceFiles(
  spec: PluginSpec,
  options: ProjectOptions
): Promise<SpecFile[]> {
  const provider = getAIProvider();

  const systemPrompt = `You are an expert Minecraft Paper plugin developer. Generate complete, compilable Java source files for a Paper plugin.

The plugin spec is:
${JSON.stringify(spec, null, 2)}

Target: Paper ${options.mcVersion}, Java ${options.javaVersion}, Package: ${spec.packageName}

Rules:
1. Generate a complete main class that extends JavaPlugin with onEnable/onDisable.
2. Generate a command executor class for EACH command in the spec.
3. Generate a listener class for EACH listener in the spec.
4. Generate a ConfigManager utility class that reads config values.
5. Generate a MessageManager utility class that sends formatted messages from config.
6. All classes must be in the package ${spec.packageName} or sub-packages (commands, listeners, managers, utils).
7. Use proper Paper API imports (org.bukkit, org.bukkit.event, etc.).
8. Include permission checks in commands.
9. Include configurable messages read from config.yml.
10. Include proper error handling and logging.
11. Code must compile without errors against paper-api.
12. Return ONLY a JSON array of files, no markdown. Each file: {"path":"src/main/java/...","content":"...","language":"java"}

Example response format:
[{"path":"src/main/java/com/example/MyPlugin.java","content":"package com.example;\\n...","language":"java"}]`;

  const messages: AIProviderMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Generate all Java source files for ${spec.name}.` },
  ];

  const response = await provider.generate(messages, { temperature: 0.2, maxTokens: 8192 });
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const files = JSON.parse(cleaned) as SpecFile[];
    return files;
  } catch {
    return [];
  }
}
