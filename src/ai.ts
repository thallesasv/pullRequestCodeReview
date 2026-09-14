import { createAnthropic } from "@ai-sdk/anthropic";
import { warning } from "@actions/core";
import { z } from "zod";
import config from "./config";
import { AISDKProvider } from "./providers/ai-sdk";

export enum AIProviderType {
  AI_SDK = "ai-sdk",
}

const LLM_MODELS: Record<AIProviderType, ModelConfig[]> = {
  [AIProviderType.AI_SDK]: [
    { name: "claude-sonnet-4-5", createAi: createAnthropic },
    { name: "claude-sonnet-4-6", createAi: createAnthropic },
    {
      name: "claude-sonnet-5",
      createAi: createAnthropic,
      supportsTemperature: false,
    },
  ],
};

export type InferenceConfig = {
  prompt: string;
  temperature?: number;
  system?: string;
  schema: z.ZodTypeAny;
};

export interface AIProvider {
  runInference(params: InferenceConfig): Promise<any>;
}

class AIProviderFactory {
  static getProvider(
    provider: AIProviderType,
    modelConfig: ModelConfig
  ): AIProvider {
    switch (provider) {
      case AIProviderType["AI_SDK"]:
        if (!modelConfig.createAi) {
          throw new Error(
            `No createAi function found for model ${modelConfig.name}`
          );
        }
        return new AISDKProvider(modelConfig.createAi, modelConfig.name);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}

type ModelConfig = {
  name: string;
  createAi?: any;
  temperature?: number;
  supportsTemperature?: boolean;
};

const MAX_LOG_STRING_LENGTH = 1200;
const MAX_LOG_ARRAY_ITEMS = 20;
const MAX_LOG_OBJECT_KEYS = 30;
const MAX_LOG_DEPTH = 4;
const SENSITIVE_KEY_REGEX = /(api[_-]?key|token|secret|password|authorization|cookie)/i;

function isSchemaValidationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const text = `${error.name} ${error.message}`;
  return /TypeValidationError|AI_TypeValidationError|NoObjectGeneratedError/i.test(
    text
  );
}

function safeParseJsonString(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractJsonFromText(text: string): unknown | null {
  const valueIndex = text.indexOf("Value:");
  const source = valueIndex >= 0 ? text.slice(valueIndex + "Value:".length) : text;
  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return safeParseJsonString(source.slice(firstBrace, lastBrace + 1).trim());
}

function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (depth > MAX_LOG_DEPTH) return "[TRUNCATED_DEPTH]";

  if (typeof value === "string") {
    if (value.length <= MAX_LOG_STRING_LENGTH) return value;
    return `${value.slice(0, MAX_LOG_STRING_LENGTH)}...[TRUNCATED]`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    const limited = value.slice(0, MAX_LOG_ARRAY_ITEMS).map((item) => sanitizeForLog(item, depth + 1));
    if (value.length > MAX_LOG_ARRAY_ITEMS) {
      limited.push(`[TRUNCATED_ITEMS:${value.length - MAX_LOG_ARRAY_ITEMS}]`);
    }
    return limited;
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_LOG_OBJECT_KEYS);

    for (const [key, nested] of entries) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = sanitizeForLog(nested, depth + 1);
      }
    }

    const totalKeys = Object.keys(value as Record<string, unknown>).length;
    if (totalKeys > MAX_LOG_OBJECT_KEYS) {
      result.__truncated_keys__ = totalKeys - MAX_LOG_OBJECT_KEYS;
    }

    return result;
  }

  return String(value);
}

function extractSchemaFailurePayload(error: unknown): unknown | null {
  if (error instanceof Error) {
    const parsedFromMessage = extractJsonFromText(error.message);
    if (parsedFromMessage) {
      return parsedFromMessage;
    }
  }

  if (!error || typeof error !== "object") {
    return null;
  }

  const record = error as Record<string, unknown>;
  const candidates = [
    "value",
    "payload",
    "object",
    "response",
    "body",
    "data",
    "result",
    "rawResponse",
    "rawText",
  ];

  for (const key of candidates) {
    if (record[key] != null) {
      return record[key];
    }
  }

  if (record.cause && typeof record.cause === "object") {
    return extractSchemaFailurePayload(record.cause);
  }

  return null;
}

function buildSchemaFailurePayloadPreview(error: unknown): string | null {
  const payload = extractSchemaFailurePayload(error);
  if (payload == null) {
    return null;
  }

  try {
    return JSON.stringify(sanitizeForLog(payload));
  } catch {
    return null;
  }
}

export async function runPrompt({
  prompt,
  systemPrompt,
  schema,
}: {
  prompt: string;
  systemPrompt?: string;
  schema: z.ZodTypeAny;
}) {
  if (
    !Object.values(AIProviderType).includes(
      config.llmProvider as AIProviderType
    )
  ) {
    throw new Error(
      `Unknown LLM provider: ${
        config.llmProvider
      }. Valid providers are: ${Object.keys(AIProviderType).join(", ")}`
    );
  }
  const providerType = config.llmProvider as AIProviderType;
  const providerModels = LLM_MODELS[providerType];
  let modelConfig = providerModels.find((m) => m.name === config.llmModel);

  if (!modelConfig) {
    throw new Error(
      `Unknown LLM model: ${config.llmModel}. For provider ${
        config.llmProvider
      }, supported models are: ${providerModels.map((m) => m.name).join(", ")}`
    );
  }

  // Get the appropriate provider for this model
  const provider = AIProviderFactory.getProvider(providerType, modelConfig);

  const inferenceConfig = {
    prompt,
    ...(modelConfig.supportsTemperature !== false &&
      modelConfig.temperature !== undefined
      ? { temperature: modelConfig.temperature }
      : {}),
    system: systemPrompt,
    schema,
  };

  try {
    // Run the inference using the provider
    return await provider.runInference(inferenceConfig);
  } catch (error) {
    if (!isSchemaValidationError(error)) {
      throw error;
    }

    warning(
      "LLM output failed schema validation. Retrying once with stricter JSON formatting instructions."
    );
    warning(`Validation error details: ${error instanceof Error ? error.message : String(error)}`);

    try {
      return await provider.runInference({
        ...inferenceConfig,
        system: `${systemPrompt ?? ""}\n\nIMPORTANT: You MUST return a valid JSON object that strictly matches the required schema. Do not include markdown, code fences, or any explanations. Only return the JSON object.`,
        prompt: `${prompt}\n\nRETURN ONLY A VALID JSON OBJECT. No markdown. No code fences. No extra text. JSON ONLY.`,
      });
    } catch (retryError) {
      warning(
        `Retry also failed: ${retryError instanceof Error ? retryError.message : String(retryError)}`
      );
      const payloadPreview = buildSchemaFailurePayloadPreview(retryError);
      if (payloadPreview) {
        warning(`Schema validation payload preview (sanitized): ${payloadPreview}`);
      }
      throw retryError;
    }
  }
}
