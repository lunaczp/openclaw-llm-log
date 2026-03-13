import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";

type PluginConfig = {
  logFilePath?: string;
  includeHistoryMessages?: boolean;
  includeSystemPrompt?: boolean;
};

type PluginConfigSchema = {
  type: "object";
  additionalProperties: boolean;
  properties: Record<
    string,
    {
      type: "string" | "boolean";
      default?: string | boolean;
      description?: string;
    }
  >;
};

type PluginDefinition = {
  id: string;
  name: string;
  description: string;
  configSchema: PluginConfigSchema;
  register(api: OpenClawPluginApi): void | Promise<void>;
};

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const DEFAULT_LOG_FILE_PATH = "./logs/openclaw-llm-log.jsonl";

const configSchema: PluginConfigSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    logFilePath: {
      type: "string",
      default: DEFAULT_LOG_FILE_PATH,
      description:
        "Path to the JSONL log file. Relative paths resolve from the OpenClaw state directory.",
    },
    includeHistoryMessages: {
      type: "boolean",
      default: true,
      description: "Whether to include full historyMessages in llm_input entries.",
    },
    includeSystemPrompt: {
      type: "boolean",
      default: true,
      description: "Whether to include systemPrompt in llm_input entries.",
    },
  },
};

function resolveConfig(raw: unknown): Required<PluginConfig> {
  const config = (raw ?? {}) as PluginConfig;
  return {
    logFilePath: config.logFilePath?.trim() || DEFAULT_LOG_FILE_PATH,
    includeHistoryMessages: config.includeHistoryMessages ?? true,
    includeSystemPrompt: config.includeSystemPrompt ?? true,
  };
}

function resolveLogFilePath(api: OpenClawPluginApi, rawPath: string): string {
  const trimmed = rawPath.trim();
  if (!trimmed) {
    return path.join(api.runtime.state.resolveStateDir(), DEFAULT_LOG_FILE_PATH);
  }
  if (trimmed.startsWith("~") || path.isAbsolute(trimmed)) {
    return api.resolvePath(trimmed);
  }
  return path.join(api.runtime.state.resolveStateDir(), trimmed);
}

function toJsonValue(value: unknown, seen = new WeakSet<object>()): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack ?? null,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }
    seen.add(value);

    const output: Record<string, JsonValue> = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = toJsonValue(entry, seen);
    }
    return output;
  }

  return String(value);
}

class JsonlWriter {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly logger: OpenClawPluginApi["logger"],
  ) {}

  async init(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
  }

  write(entry: Record<string, JsonValue>): void {
    this.queue = this.queue
      .then(async () => {
        await appendFile(this.filePath, `${JSON.stringify(entry)}\n`, "utf8");
      })
      .catch((error) => {
        this.logger.warn?.(`openclaw-llm-log: failed to append log entry: ${String(error)}`);
      });
  }
}

const plugin: PluginDefinition = {
  id: "openclaw-llm-log",
  name: "LLM Log",
  description: "Logs OpenClaw LLM inputs and outputs to a local JSONL file.",
  configSchema,
  async register(api: OpenClawPluginApi) {
    const config = resolveConfig(api.pluginConfig);
    const logFilePath = resolveLogFilePath(api, config.logFilePath);
    const writer = new JsonlWriter(logFilePath, api.logger);

    await writer.init();
    api.logger.info?.(`openclaw-llm-log: writing JSONL logs to ${logFilePath}`);

    api.on("llm_input", (event, ctx) => {
      writer.write({
        event: "llm_input",
        timestamp: new Date().toISOString(),
        runId: event.runId,
        sessionId: event.sessionId,
        provider: event.provider,
        model: event.model,
        context: toJsonValue(ctx),
        payload: {
          systemPrompt: config.includeSystemPrompt ? toJsonValue(event.systemPrompt) : null,
          prompt: toJsonValue(event.prompt),
          historyMessages: config.includeHistoryMessages ? toJsonValue(event.historyMessages) : [],
          imagesCount: event.imagesCount,
        },
      });
    });

    api.on("llm_output", (event, ctx) => {
      writer.write({
        event: "llm_output",
        timestamp: new Date().toISOString(),
        runId: event.runId,
        sessionId: event.sessionId,
        provider: event.provider,
        model: event.model,
        context: toJsonValue(ctx),
        payload: {
          assistantTexts: toJsonValue(event.assistantTexts),
          lastAssistant: toJsonValue(event.lastAssistant),
          usage: toJsonValue(event.usage),
        },
      });
    });
  },
};

export default plugin;
