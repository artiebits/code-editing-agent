const readline = require("readline")
const { Ollama } = require("ollama")
const fs = require("fs")
const path = require("path")

async function runAgent(getUserMessage, tools = [], model = "gpt-oss:20b") {
  const ollamaTools = tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }))
  const ollama = new Ollama({ host: "http://localhost:11434" })
  const conversation = []

  console.log("Chat with Agent (use 'ctrl-c' to quit)")

  let readUserInput = true
  while (true) {
    if (readUserInput) {
      process.stdout.write("\x1b[94mYou\x1b[0m: ")
      const userInput = await getUserMessage()
      if (!userInput) break

      conversation.push({ role: "user", content: userInput })
    }

    const response = await ollama.chat({
      model: model,
      messages: conversation,
      tools: ollamaTools,
      stream: false,
    })

    const message = response.message
    conversation.push(message)

    if (message.content) {
      console.log(`\x1b[93mAgent\x1b[0m: ${message.content}`)
    }

    if (!message.tool_calls || message.tool_calls.length === 0) {
      readUserInput = true
      continue
    }

    readUserInput = false
    for (const toolCall of message.tool_calls) {
      const args =
        typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments
      const result = executeTool(tools, toolCall.id, toolCall.function.name, args)
      conversation.push(result)
    }
    console.log("Tools called: ", message.tool_calls)
  }
}

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
})

// Function to get user input
const getUserMessage = () =>
  new Promise((resolve) => {
    rl.once("line", (input) => {
      resolve(input.trim() || null)
    })
  })

function executeTool(tools, id, name, input) {
  const tool = tools.find((t) => t.name === name)
  if (!tool) {
    return { role: "tool", tool_call_id: id, name, content: "Tool not found" }
  }

  console.log(`\x1b[92mtool\x1b[0m: ${name}(${JSON.stringify(input)})`)

  try {
    const response = tool.function(input)
    return { role: "tool", tool_call_id: id, name, content: response }
  } catch (err) {
    return { role: "tool", tool_call_id: id, name, content: err.message }
  }
}

const tools = [
  {
    name: "read_file",
    description:
      "Read the contents of a given relative file path. Use this when you want to see what's inside a file. Do not use this with directory names.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "The relative path of a file in the working directory." },
      },
      required: ["path"],
    },
    function: (input) => {
      const filePath = input.path
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`)
      }
      return fs.readFileSync(filePath, "utf8")
    },
  },
  {
    name: "list_files",
    description:
      "List files and directories at a given path. If no path is provided, lists files in the current directory.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Optional relative path to list files from. Defaults to current directory if not provided.",
        },
      },
    },
    function: (input) => {
      const dir = input.path || "."
      const files = []

      function walk(currentDir) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name)
          const relPath = path.relative(dir, fullPath)
          if (relPath) {
            files.push(entry.isDirectory() ? `${relPath}/` : relPath)
          }
          if (entry.isDirectory()) {
            walk(fullPath)
          }
        }
      }

      walk(dir)
      return JSON.stringify(files)
    },
  },
  {
    name: "edit_file",
    description: `Make edits to a text file.

Replaces 'old_str' with 'new_str' in the given file. 'old_str' and 'new_str' MUST be different from each other.
'old_str' must match exactly and appear exactly once in the file.

If the file specified with path doesn't exist, it will be created.`,
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "The path to the file" },
        old_str: {
          type: "string",
          description: "Text to search for - must match exactly and must only have one match",
        },
        new_str: { type: "string", description: "Text to replace with" },
      },
      required: ["path", "old_str", "new_str"],
    },
    function: (input) => {
      const { path: filePath, old_str, new_str } = input
      let content = ""
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, "utf8")
      }

      // Check for exactly one occurrence
      const occurrences = (content.match(new RegExp(old_str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
      if (occurrences !== 1) {
        throw new Error(`old_str must appear exactly once, but found ${occurrences} matches.`)
      }

      if (old_str === new_str) {
        throw new Error("old_str and new_str must be different.")
      }

      content = content.replace(old_str, new_str)
      fs.writeFileSync(filePath, content, "utf8")
      return "File edited successfully."
    },
  },
]

// Run the agent
runAgent(getUserMessage, tools).catch(console.error)
