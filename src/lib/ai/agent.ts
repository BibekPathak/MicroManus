import OpenAI from "openai"
import { searchAndSummarize } from "@/lib/brave/search"

export interface AgentState {
  messages: Array<{ role: "user" | "assistant"; content: string }>
  model: string
  apiKey: string
  endpoint: string
  tokensIn: number
  tokensOut: number
  cacheTokens: number
}

async function runAgentLoop(
  state: AgentState,
  maxIterations = 10
): Promise<{
  response: string
  pdfRequest?: { title: string; content: string }
  tokensIn: number
  tokensOut: number
  cacheTokens: number
}> {
  const client = new OpenAI({
    apiKey: state.apiKey,
    baseURL: state.endpoint,
  })

  let totalTokensIn = state.tokensIn
  let totalTokensOut = state.tokensOut
  let totalCacheTokens = state.cacheTokens
  let pdfRequest: { title: string; content: string } | undefined

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "web_search",
        description: "Search the web for current information. Use this when you need up-to-date information on any topic.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query" },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "generate_pdf",
        description: "Generate a PDF report with the research findings. Call this when you have completed your research.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Title of the report" },
            content: { type: "string", description: "Full markdown content of the report" },
          },
          required: ["title", "content"],
        },
      },
    },
  ]

  const systemMessage: OpenAI.Chat.Completions.ChatCompletionSystemMessageParam = {
    role: "system",
    content: `You are MicroManus, a deep research AI agent. You have access to web search and PDF generation tools.

When given a research task:
1. Think about what information you need
2. Use the web_search tool to find information
3. Analyze the results
4. Do more searches if needed
5. Synthesize your findings into a comprehensive answer
6. If the user asks for a report, use the generate_pdf tool

Always be thorough and cite your sources.`,
  }

  const conversation: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    systemMessage,
    ...state.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ]

  for (let i = 0; i < maxIterations; i++) {
    const response = await client.chat.completions.create({
      model: state.model,
      messages: conversation,
      tools: tools,
      tool_choice: "auto",
    })

    const choice = response.choices[0]
    const message = choice.message

    if (!message) break

    totalTokensIn += response.usage?.prompt_tokens || 0
    totalTokensOut += response.usage?.completion_tokens || 0

    conversation.push({
      role: "assistant",
      content: message.content || "",
      tool_calls: message.tool_calls,
    } as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam)

    if (!message.tool_calls || message.tool_calls.length === 0) {
      break
    }

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== "function") continue
      const args = JSON.parse(toolCall.function.arguments)

      if (toolCall.function.name === "generate_pdf") {
        pdfRequest = { title: args.title, content: args.content }
        conversation.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: `PDF report "${args.title}" has been generated. Tell the user it's ready for download.`,
        })
      } else {
        const result = await searchAndSummarize(args.query)
        conversation.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: typeof result === "string" ? result : JSON.stringify(result),
        })
      }
    }
  }

  const lastMessage = conversation[conversation.length - 1]
  const content = typeof lastMessage.content === "string" ? lastMessage.content : ""

  return {
    response: content,
    pdfRequest,
    tokensIn: totalTokensIn,
    tokensOut: totalTokensOut,
    cacheTokens: totalCacheTokens,
  }
}

export async function runAgent(
  state: AgentState
): Promise<{
  response: string
  pdfRequest?: { title: string; content: string }
  tokensIn: number
  tokensOut: number
  cacheTokens: number
}> {
  return runAgentLoop(state)
}
