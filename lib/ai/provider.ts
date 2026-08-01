import type { AIProviderMessage } from '@/lib/types';

export interface AIProvider {
  generate(
    messages: AIProviderMessage[],
    options?: AIOptions
  ): Promise<string>;

  generateStream(
    messages: AIProviderMessage[],
    options?: AIOptions
  ): AsyncGenerator<string, void, unknown>;
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

type ProviderName = 'openrouter' | 'openai' | 'anthropic' | 'gemini';

interface ProviderConfig {
  name: ProviderName;
  apiKey: string;
  model: string;
  baseUrl: string;
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
    code?: string | number;
  };
}

interface AnthropicResponse {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
  error?: {
    message?: string;
    type?: string;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    message?: string;
    code?: number;
    status?: string;
  };
}

function getRequiredEnvironmentVariable(
  name: string,
  value: string | undefined
): string {
  const cleanValue = value?.trim();

  if (!cleanValue) {
    throw new Error(
      `Missing environment variable: ${name}. Add it to your .env file and restart the development server.`
    );
  }

  return cleanValue;
}

function getProviderName(): ProviderName {
  const value = (process.env.AI_PROVIDER || 'gemini')
    .trim()
    .toLowerCase();

  if (
    value !== 'openrouter' &&
    value !== 'openai' &&
    value !== 'anthropic' &&
    value !== 'gemini'
  ) {
    throw new Error(
      `Invalid AI_PROVIDER "${value}". Use openrouter, openai, anthropic, or gemini.`
    );
  }

  return value;
}

function getProviderConfig(): ProviderConfig {
  const provider = getProviderName();

  switch (provider) {
    case 'gemini':
      return {
        name: 'gemini',
        apiKey: getRequiredEnvironmentVariable(
          'GOOGLE_API_KEY',
          process.env.GOOGLE_API_KEY ||
            process.env.GOOGLE_GEMINI_API_KEY ||
            process.env.GEMINI_API_KEY
        ),
        model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash',
        baseUrl:
          'https://generativelanguage.googleapis.com/v1beta/models',
      };

    case 'openrouter':
      return {
        name: 'openrouter',
        apiKey: getRequiredEnvironmentVariable(
          'OPENROUTER_API_KEY',
          process.env.OPENROUTER_API_KEY
        ),
        model: getRequiredEnvironmentVariable(
          'OPENROUTER_MODEL',
          process.env.OPENROUTER_MODEL
        ),
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
      };

    case 'openai':
      return {
        name: 'openai',
        apiKey: getRequiredEnvironmentVariable(
          'OPENAI_API_KEY',
          process.env.OPENAI_API_KEY
        ),
        model: getRequiredEnvironmentVariable(
          'OPENAI_MODEL',
          process.env.OPENAI_MODEL
        ),
        baseUrl: 'https://api.openai.com/v1/chat/completions',
      };

    case 'anthropic':
      return {
        name: 'anthropic',
        apiKey: getRequiredEnvironmentVariable(
          'ANTHROPIC_API_KEY',
          process.env.ANTHROPIC_API_KEY
        ),
        model: getRequiredEnvironmentVariable(
          'ANTHROPIC_MODEL',
          process.env.ANTHROPIC_MODEL
        ),
        baseUrl: 'https://api.anthropic.com/v1/messages',
      };
  }
}

export function getAIProvider(): AIProvider {
  const config = getProviderConfig();

  switch (config.name) {
    case 'gemini':
      return new GeminiProvider(config);

    case 'anthropic':
      return new AnthropicProvider(config);

    case 'openai':
    case 'openrouter':
      return new OpenAICompatibleProvider(config);
  }
}

export function isAIConfigured(): boolean {
  try {
    getProviderConfig();
    return true;
  } catch {
    return false;
  }
}

async function readErrorResponse(
  response: Response,
  providerName: string
): Promise<Error> {
  let body = '';

  try {
    body = await response.text();
  } catch {
    body = '';
  }

  let message = body;

  try {
    const parsed = JSON.parse(body) as {
      error?: {
        message?: string;
      };
      message?: string;
    };

    message =
      parsed.error?.message ||
      parsed.message ||
      body;
  } catch {
    // The response was not JSON. Use its original text.
  }

  if (!message) {
    message = response.statusText || 'Unknown API error';
  }

  return new Error(
    `${providerName} API error (${response.status}): ${message}`
  );
}

function extractGeminiText(data: GeminiResponse): string {
  const text =
    data.candidates
      ?.flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text || '')
      .join('') || '';

  if (text.trim()) {
    return text;
  }

  if (data.promptFeedback?.blockReason) {
    throw new Error(
      `Gemini blocked the prompt: ${data.promptFeedback.blockReason}`
    );
  }

  const finishReason = data.candidates?.[0]?.finishReason;

  if (finishReason) {
    throw new Error(
      `Gemini returned no text. Finish reason: ${finishReason}`
    );
  }

  throw new Error('Gemini returned an empty response.');
}

async function* parseServerSentEvents(
  response: Response
): AsyncGenerator<unknown, void, unknown> {
  if (!response.body) {
    throw new Error('Streaming response body is missing.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';

      for (const event of events) {
        const dataLines = event
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim());

        if (dataLines.length === 0) {
          continue;
        }

        const data = dataLines.join('\n');

        if (data === '[DONE]') {
          return;
        }

        try {
          yield JSON.parse(data);
        } catch {
          // Ignore malformed or incomplete stream events.
        }
      }
    }

    const remaining = buffer.trim();

    if (remaining) {
      const data = remaining
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');

      if (data && data !== '[DONE]') {
        try {
          yield JSON.parse(data);
        } catch {
          // Ignore malformed final data.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

class OpenAICompatibleProvider implements AIProvider {
  constructor(private readonly config: ProviderConfig) {}

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
    };

    if (this.config.name === 'openrouter') {
      headers['HTTP-Referer'] =
        process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      headers['X-Title'] = 'NOVX AI';
    }

    return headers;
  }

  async generate(
    messages: AIProviderMessage[],
    options?: AIOptions
  ): Promise<string> {
    const response = await fetch(this.config.baseUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: options?.model || this.config.model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 8192,
        stream: false,
      }),
      signal: AbortSignal.timeout(180_000),
    });

    if (!response.ok) {
      throw await readErrorResponse(
        response,
        this.config.name === 'openrouter'
          ? 'OpenRouter'
          : 'OpenAI'
      );
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const text = data.choices?.[0]?.message?.content;

    if (!text?.trim()) {
      if (data.error?.message) {
        throw new Error(
          `${this.config.name} API error: ${data.error.message}`
        );
      }

      throw new Error(
        `${this.config.name} returned an empty response.`
      );
    }

    return text;
  }

  async *generateStream(
    messages: AIProviderMessage[],
    options?: AIOptions
  ): AsyncGenerator<string, void, unknown> {
    const response = await fetch(this.config.baseUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: options?.model || this.config.model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 8192,
        stream: true,
      }),
      signal: AbortSignal.timeout(180_000),
    });

    if (!response.ok) {
      throw await readErrorResponse(
        response,
        this.config.name === 'openrouter'
          ? 'OpenRouter'
          : 'OpenAI'
      );
    }

    for await (const event of parseServerSentEvents(response)) {
      const parsed = event as {
        choices?: Array<{
          delta?: {
            content?: string;
          };
          error?: {
            message?: string;
          };
        }>;
        error?: {
          message?: string;
        };
      };

      if (parsed.error?.message) {
        throw new Error(
          `${this.config.name} stream error: ${parsed.error.message}`
        );
      }

      const choice = parsed.choices?.[0];

      if (choice?.error?.message) {
        throw new Error(
          `${this.config.name} stream error: ${choice.error.message}`
        );
      }

      const text = choice?.delta?.content;

      if (text) {
        yield text;
      }
    }
  }
}

class AnthropicProvider implements AIProvider {
  constructor(private readonly config: ProviderConfig) {}

  private splitMessages(messages: AIProviderMessage[]): {
    system?: string;
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
    }>;
  } {
    const systemMessages = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');

    const conversation = messages
      .filter(
        (message) =>
          message.role === 'user' ||
          message.role === 'assistant'
      )
      .map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      }));

    return {
      system: systemMessages || undefined,
      messages: conversation,
    };
  }

  async generate(
    messages: AIProviderMessage[],
    options?: AIOptions
  ): Promise<string> {
    const payload = this.splitMessages(messages);

    const response = await fetch(this.config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options?.model || this.config.model,
        system: payload.system,
        messages: payload.messages,
        max_tokens: options?.maxTokens ?? 8192,
        temperature: options?.temperature ?? 0.3,
        stream: false,
      }),
      signal: AbortSignal.timeout(180_000),
    });

    if (!response.ok) {
      throw await readErrorResponse(response, 'Anthropic');
    }

    const data = (await response.json()) as AnthropicResponse;

    const text =
      data.content
        ?.filter((block) => block.type === 'text')
        .map((block) => block.text || '')
        .join('') || '';

    if (!text.trim()) {
      throw new Error(
        data.error?.message || 'Anthropic returned an empty response.'
      );
    }

    return text;
  }

  async *generateStream(
    messages: AIProviderMessage[],
    options?: AIOptions
  ): AsyncGenerator<string, void, unknown> {
    const payload = this.splitMessages(messages);

    const response = await fetch(this.config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options?.model || this.config.model,
        system: payload.system,
        messages: payload.messages,
        max_tokens: options?.maxTokens ?? 8192,
        temperature: options?.temperature ?? 0.3,
        stream: true,
      }),
      signal: AbortSignal.timeout(180_000),
    });

    if (!response.ok) {
      throw await readErrorResponse(response, 'Anthropic');
    }

    for await (const event of parseServerSentEvents(response)) {
      const parsed = event as {
        type?: string;
        delta?: {
          type?: string;
          text?: string;
        };
        error?: {
          message?: string;
        };
      };

      if (parsed.type === 'error') {
        throw new Error(
          `Anthropic stream error: ${
            parsed.error?.message || 'Unknown streaming error'
          }`
        );
      }

      if (
        parsed.type === 'content_block_delta' &&
        parsed.delta?.type === 'text_delta' &&
        parsed.delta.text
      ) {
        yield parsed.delta.text;
      }
    }
  }
}

class GeminiProvider implements AIProvider {
  constructor(private readonly config: ProviderConfig) {}

  private buildRequestBody(
    messages: AIProviderMessage[],
    options?: AIOptions
  ): Record<string, unknown> {
    const systemText = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');

    const contents = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      }));

    return {
      contents,
      ...(systemText
        ? {
            systemInstruction: {
              parts: [{ text: systemText }],
            },
          }
        : {}),
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxTokens ?? 8192,
      },
    };
  }

  private getUrl(
    model: string,
    streaming: boolean
  ): string {
    const method = streaming
      ? 'streamGenerateContent?alt=sse'
      : 'generateContent';

    return `${this.config.baseUrl}/${encodeURIComponent(
      model
    )}:${method}`;
  }

  async generate(
    messages: AIProviderMessage[],
    options?: AIOptions
  ): Promise<string> {
    const model = options?.model || this.config.model;
    const response = await fetch(this.getUrl(model, false), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.config.apiKey,
      },
      body: JSON.stringify(
        this.buildRequestBody(messages, options)
      ),
      signal: AbortSignal.timeout(180_000),
    });

    if (!response.ok) {
      throw await readErrorResponse(response, 'Gemini');
    }

    const data = (await response.json()) as GeminiResponse;
    return extractGeminiText(data);
  }

  async *generateStream(
    messages: AIProviderMessage[],
    options?: AIOptions
  ): AsyncGenerator<string, void, unknown> {
    const model = options?.model || this.config.model;
    const response = await fetch(this.getUrl(model, true), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.config.apiKey,
      },
      body: JSON.stringify(
        this.buildRequestBody(messages, options)
      ),
      signal: AbortSignal.timeout(180_000),
    });

    if (!response.ok) {
      throw await readErrorResponse(response, 'Gemini');
    }

    for await (const event of parseServerSentEvents(response)) {
      const parsed = event as GeminiResponse;

      if (parsed.error?.message) {
        throw new Error(
          `Gemini stream error: ${parsed.error.message}`
        );
      }

      const text =
        parsed.candidates
          ?.flatMap(
            (candidate) => candidate.content?.parts || []
          )
          .map((part) => part.text || '')
          .join('') || '';

      if (text) {
        yield text;
      }
    }
  }
}