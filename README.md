# openclaw-llm-log

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

## 配置

```json
{
  "plugins": {
    "entries": {
      "llm-log": {
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

如果你确实需要手动写路径配置，请使用你自己的插件目录，例如：

```json
{
  "plugins": {
    "entries": {
      "llm-log": {
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
