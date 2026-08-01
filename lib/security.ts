/**
 * Security utilities for input validation, prompt sanitization, and rate limiting.
 */

// Characters that could be used for prompt injection or code injection
const DANGEROUS_PATTERNS = [
  /```/g, // Code blocks
  /\$\{/g, // Template literals
  /\\x[0-9a-fA-F]{2}/g, // Hex escapes
  /\\u[0-9a-fA-F]{4}/g, // Unicode escapes
  /<script/gi, // Script tags
  /javascript:/gi, // JS protocol
  /\r/g, // Carriage returns
];

const MAX_PROMPT_LENGTH = 5000;
const MIN_PROMPT_LENGTH = 10;

/**
 * Validate that a prompt meets length requirements.
 */
export function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || prompt.trim().length < MIN_PROMPT_LENGTH) {
    return { valid: false, error: `Prompt must be at least ${MIN_PROMPT_LENGTH} characters` };
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { valid: false, error: `Prompt must be under ${MAX_PROMPT_LENGTH} characters` };
  }
  return { valid: true };
}

/**
 * Sanitize a prompt to prevent injection attacks.
 * Strips dangerous patterns while preserving readable text.
 */
export function sanitizePrompt(prompt: string): string {
  let cleaned = prompt;

  for (const pattern of DANGEROUS_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Limit consecutive newlines
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

  // Trim and normalize whitespace
  return cleaned.trim();
}

/**
 * Simple in-memory rate limiter.
 * For production, use Redis or Upstash.
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetTime < now) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime };
}

/**
 * Validate a project path to prevent path traversal.
 */
export function validatePath(path: string): boolean {
  // Reject paths with .. or absolute paths
  if (path.includes('..') || path.startsWith('/') || path.startsWith('\\')) {
    return false;
  }
  return true;
}

/**
 * Validate environment variables required for AI.
 */
export function validateAIConfig(): { configured: boolean; provider: string } {
  const provider = process.env.AI_PROVIDER || 'openrouter';
  const keyMap: Record<string, string | undefined> = {
    openrouter: process.env.OPENROUTER_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    gemini: process.env.GOOGLE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY,
  };

  return {
    configured: !!keyMap[provider],
    provider,
  };
}
