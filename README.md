# Code Editing Agent

A simple CLI agent that uses Ollama. It can read files, list directories, and make file edits.

## Features

- Privacy: Fully local, no data leaves your machine
- Cost: Free (runs on your hardware)
- Customizable: Open source; modify tools and behavior
- No dependencies: No API keys or subscriptions

## Prerequisites

- Node.js (v14+)
- [Ollama](https://ollama.ai/) installed and a model available (default: `gpt-oss:20b`)

## Installation

```bash
npm install
```

## Usage

```bash
node index.js
```

The agent will:
1. Check if Ollama is running on `http://localhost:11434`
2. Start it automatically if needed (stops on exit)
3. Begin an interactive chat session

Type your requests naturally. The model will use available tools to help you.

## Available Tools

The agent has access to these tools:

- **`read_file`**: Read contents of a file
  - `path`: Relative file path
  
- **`list_files`**: List files and directories recursively
  - `path`: Optional directory path (defaults to current directory)
  
- **`edit_file`**: Replace text in a file
  - `path`: File path
  - `old_str`: Exact text to replace (must appear exactly once)
  - `new_str`: Replacement text

## Configuration

Set environment variables to customize behavior:

- `OLLAMA_HOST`: Ollama server URL (default: `http://localhost:11434`)
- `OLLAMA_BIN`: Path to `ollama` binary (default: `ollama`)
- `OLLAMA_TIMEOUT_MS`: Startup timeout in ms (default: `20000`)

Example:
```bash
OLLAMA_HOST=http://localhost:11434 OLLAMA_TIMEOUT_MS=30000 node index.js
```
