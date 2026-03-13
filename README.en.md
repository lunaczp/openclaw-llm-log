# @lunaczp/openclaw-llm-log

[中文说明](./README.md)

A minimal OpenClaw plugin that listens to the `llm_input` and `llm_output` hooks and appends model request/response data to a local JSONL log file.

## Install

For local development, using a linked plugin directory is recommended:

```bash
openclaw plugins install -l ./openclaw-llm-log
```

If you are already inside the plugin directory, you can also run:

```bash
openclaw plugins install -l .
```

After publishing to npm, you can install it directly by package name:

```bash
openclaw plugins install @lunaczp/openclaw-llm-log
```

## Configuration

```json
{
  "plugins": {
    "allow": [
      "openclaw-llm-log"
    ],
    "entries": {
      "openclaw-llm-log": {
        "enabled": true,
        "config": {
          "logFilePath": "./logs/openclaw-llm-log.jsonl",
          "includeHistoryMessages": true,
          "includeSystemPrompt": true
        }
      }
    }
  }
}
```

It is recommended to add `openclaw-llm-log` to `plugins.allow`. Otherwise, OpenClaw may print a startup warning like:

```text
plugins.allow is empty; discovered non-bundled plugins may auto-load
```

This is not a plugin error. It is a security reminder from OpenClaw for third-party plugins. Once the plugin is explicitly added to the allowlist, the warning will disappear.

If you need to configure the plugin path manually, use your own local plugin directory, for example:

```json
{
  "plugins": {
    "allow": [
      "openclaw-llm-log"
    ],
    "entries": {
      "openclaw-llm-log": {
        "enabled": true,
        "path": "/path/to/openclaw-llm-log"
      }
    }
  }
}
```

## Log Format

Each line in the log file is one JSON object containing:

- `event`: `llm_input` or `llm_output`
- `timestamp`
- `runId`
- `sessionId`
- `provider`
- `model`
- `context`
- `payload`

This format works well with tools like `jq`, `rg`, or any log collection pipeline.

## Publish to npm

Before publishing:

```bash
npm run typecheck
npm pack
```

After confirming the tarball contents are correct:

```bash
npm publish --access public
```

Notes:

- `prepack` automatically runs `npm run build`
- The npm package includes `dist/`, `openclaw.plugin.json`, `README.md`, `README.en.md`, and `LICENSE`
- If you use the repository directly from Git, it is still recommended to run `npm ci && npm run build` first
- Since `0.2.0`, the plugin id is `openclaw-llm-log`, and your OpenClaw config key should use that id
- Relative `logFilePath` values are resolved under the OpenClaw state directory, not the process working directory
