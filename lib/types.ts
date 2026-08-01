export interface ProjectOptions {
  platform: string;
  mcVersion: string;
  javaVersion: string;
  pluginName: string;
  packageName: string;
  mainClass: string;
  difficulty: string;
}

export interface PluginSpec {
  name: string;
  mainClass: string;
  packageName: string;
  version: string;
  apiVersion: string;
  author: string;
  description: string;
  commands: SpecCommand[];
  listeners: SpecListener[];
  permissions: SpecPermission[];
  configKeys: SpecConfigKey[];
  dependencies: SpecDependency[];
  files: SpecFile[];
}

export interface SpecCommand {
  name: string;
  description: string;
  usage: string;
  permission: string;
  aliases: string[];
}

export interface SpecListener {
  event: string;
  description: string;
}

export interface SpecPermission {
  name: string;
  description: string;
  default: string;
}

export interface SpecConfigKey {
  key: string;
  value: string;
  comment: string;
}

export interface SpecDependency {
  name: string;
  groupId: string;
  artifactId: string;
  version: string;
  optional: boolean;
}

export interface SpecFile {
  path: string;
  content: string;
  language: string;
}

export interface BuildResult {
  success: boolean;
  logs: string;
  jarPath?: string;
  zipPath?: string;
  error?: string;
  attempts: number;
}

export interface AIProviderMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatModification {
  file: string;
  action: 'create' | 'update' | 'delete';
  content?: string;
  description: string;
}

export interface PipelineStage {
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  message?: string;
}
