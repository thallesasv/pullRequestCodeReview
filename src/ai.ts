import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { warning } from "@actions/core";
import { z } from "zod";
import config from "./config";
import { AISDKProvider } from "./providers/ai-sdk";
import { SAPAIProvider } from "./providers/sapaicore";

export enum AIProviderType {
  AI_SDK = "ai-sdk",
  SAP_AI_SDK = "sap-ai-sdk",
}

const LLM_MODELS: Record<AIProviderType, ModelConfig[]> = {
  [AIProviderType.AI_SDK]: [
    // Anthropic
    {
      name: "claude-3-5-sonnet-20240620",
      createAi: createAnthropic,
    },
    {
      name: "claude-3-5-sonnet-20241022",
      createAi: createAnthropic,
    },
    {
      name: "claude-3-7-sonnet-20250219",
      createAi: createAnthropic,
    },
    {
      name: "claude-sonnet-4-20250514",
      createAi: createAnthropic,
    },
    {
      name: "claude-opus-4-20250514",
      createAi: createAnthropic,
    },
    {
      name: "claude-opus-4-1-20250805",
      createAi: createAnthropic,
    },
    {
      name: "claude-sonnet-4-5-20250929",
      createAi: createAnthropic,
    },
    {
      name: "claude-sonnet-4-5",
      createAi: createAnthropic,
    },
    {
      name: "claude-sonnet-4-6",
      createAi: createAnthropic,
    },
    {
      name: "claude-sonnet-5",
      createAi: createAnthropic,
      supportsTemperature: false,
    },
    // OpenAI
    {
      name: "gpt-5",
      createAi: createOpenAI,
      temperature: 1,
    },
    {
      name: "gpt-5-mini",
      createAi: createOpenAI,
      temperature: 1,
    },
    {
      name: "gpt-5-nano",
      createAi: createOpenAI,
      temperature: 1,
    },
    {
      name: "gpt-4.1-mini",
      createAi: createOpenAI,
    },
    {
      name: "gpt-4o-mini",
      createAi: createOpenAI,
    },
    {
      name: "o1",
      createAi: createOpenAI,
    },
    {
      name: "o1-mini",
      createAi: createOpenAI,
    },
    {
      name: "o3-mini",
      createAi: createOpenAI,
      temperature: 1,
    },
    {
      name: "o4-mini",
      createAi: createOpenAI,
      temperature: 1,
    },
    {
      name: "gpt-4.1",
      createAi: createOpenAI,
    },
    // Google stable models https://ai.google.dev/gemini-api/docs/models/gemini
    {
      name: "gemini-2.0-flash-001",
      createAi: createGoogleGenerativeAI,
    },
    {
      name: "gemini-2.0-flash-lite-preview-02-05",
      createAi: createGoogleGenerativeAI,
    },
    {
      name: "gemini-1.5-flash",
      createAi: createGoogleGenerativeAI,
    },
    {
      name: "gemini-1.5-flash-latest",
      createAi: createGoogleGenerativeAI,
    },
    {
      name: "gemini-1.5-flash-8b",
      createAi: createGoogleGenerativeAI,
    },
    {
      name: "gemini-1.5-pro",
      createAi: createGoogleGenerativeAI,
    },
    {
      name: "gemini-2.5-pro",
      createAi: createGoogleGenerativeAI,
    },
    {
      name: "gemini-2.5-flash",
      createAi: createGoogleGenerativeAI,
    },
    // Google experimental models https://ai.google.dev/gemini-api/docs/models/experimental-models
    {
      name: "gemini-2.5-pro-preview-05-06",
      createAi: createGoogleGenerativeAI,
    },
    {
      name: "gemini-2.5-flash-preview-04-17",
      createAi: createGoogleGenerativeAI,
    },
    {
      name: "gemini-2.0-pro-exp-02-05",
      createAi: createGoogleGenerativeAI,
    },
    {
      name: "gemini-2.0-flash-thinking-exp-01-21",
      createAi: createGoogleGenerativeAI,
    },
    {
      name: "gemini-2.5-flash-preview-05-20",
      createAi: createGoogleGenerativeAI,
    },
    {
      name: "gemini-2.5-flash-lite-preview-06-17",
      createAi: createGoogleGenerativeAI,
    },
  ],
  [AIProviderType.SAP_AI_SDK]: [
    {
      name: "anthropic--claude-3.7-sonnet",
    },
    {
      name: "anthropic--claude-3.5-sonnet",
    },
    {
      name: "anthropic--claude-3-sonnet",
    },
    {
      name: "anthropic--claude-3-haiku",
    },
    {
      name: "anthropic--claude-3-opus",
    },
    {
      name: "gpt-4o",
    },
    {
      name: "gpt-4",
    },
    {
      name: "gpt-4o-mini",
    },
    {
      name: "o1",
    },
    {
      name: "gpt-4.1",
    },
    {
      name: "gpt-4.1-nano",
    },
    {
      name: "gpt-5",
    },
    {
      name: "gpt-5-mini",
    },
    {
      name: "gpt-5-nano",
    },
    {
      name: "o3-mini",
    },
    {
      name: "o3",
    },
    {
      name: "o4-mini",
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
      case AIProviderType["SAP_AI_SDK"]:
        return new SAPAIProvider(modelConfig.name);
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

  // When using a custom base URL, skip whitelist validation and use OpenAI SDK
  if (!modelConfig && config.llmBaseUrl && providerType === AIProviderType.AI_SDK) {
    modelConfig = {
      name: config.llmModel!,
      createAi: createOpenAI,
    };
  }

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
