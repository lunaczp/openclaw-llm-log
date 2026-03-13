# @lunaczp/openclaw-llm-log

[English README](./README.en.md)

一个最小的 OpenClaw plugin，在模型请求前后分别监听 `llm_input` 和 `llm_output` hook，并把内容追加写入本地 JSONL 日志文件。

## 安装

本地开发时，推荐用 link 方式安装插件目录：

```bash
openclaw plugins install -l ./openclaw-llm-log
```

如果你已经在插件目录内，也可以直接执行：

```bash
openclaw plugins install -l .
```

发布到 npm 后，推荐直接通过包名安装：

```bash
openclaw plugins install @lunaczp/openclaw-llm-log
```

## 配置

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

建议把 `openclaw-llm-log` 加到 `plugins.allow`。否则 OpenClaw 可能会在启动时提示：

```text
plugins.allow is empty; discovered non-bundled plugins may auto-load
```

这不是插件错误，但属于 OpenClaw 对第三方插件的安全提醒。显式加入 allowlist 后，这个 warning 就不会再出现。

如果你确实需要手动写路径配置，请使用你自己的插件目录，例如：

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

## 日志格式

每行一条 JSON，包含：

- `event`: `llm_input` 或 `llm_output`
- `timestamp`
- `runId`
- `sessionId`
- `provider`
- `model`
- `context`
- `payload`

适合后续用 `jq`、`rg` 或日志采集系统直接处理。

## 发布到 npm

发布前执行：

```bash
npm run typecheck
npm pack
```

确认 tarball 内容没问题后再发布：

```bash
npm publish --access public
```

说明：

- `prepack` 会在打包前自动执行 `npm run build`
- npm 包会包含 `dist/`、`openclaw.plugin.json`、`README.md` 和 `LICENSE`
- 从 Git 仓库直接使用时，仍然建议先执行 `npm ci && npm run build`
- `0.2.0` 起插件 id 为 `openclaw-llm-log`，OpenClaw 配置键也应使用这个 id
- 相对 `logFilePath` 会解析到 OpenClaw 的 state 目录下，而不是进程当前工作目录
