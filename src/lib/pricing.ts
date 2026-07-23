export const MODEL_PRICING = {
  "gpt-4o": {
    input: 0.0000025,
    output: 0.00001,
    cache: 0.00000125,
    name: "GPT-4o",
  },
  "gpt-4o-mini": {
    input: 0.00000015,
    output: 0.0000006,
    cache: 0.000000075,
    name: "GPT-4o Mini",
  },
  "claude-sonnet-4-20250514": {
    input: 0.000003,
    output: 0.000015,
    cache: 0.0000003,
    name: "Claude Sonnet 4",
  },
  "claude-haiku-3-5-20241022": {
    input: 0.0000008,
    output: 0.000004,
    cache: 0.00000008,
    name: "Claude Haiku 3.5",
  },
  "kimi-k2": {
    input: 0.000001,
    output: 0.000004,
    cache: 0.00000025,
    name: "Kimi K2",
  },
  "deepseek/deepseek-v4-flash": {
    input: 0.0000004,
    output: 0.0000016,
    cache: 0.0000001,
    name: "DeepSeek V4 Flash",
  },
} as const

export type ModelId = keyof typeof MODEL_PRICING

export function getModelPricing(modelId: string) {
  return MODEL_PRICING[modelId as ModelId] || MODEL_PRICING["gpt-4o"]
}

export function calculateCost(
  modelId: string,
  tokensIn: number,
  tokensOut: number,
  cacheTokens: number
): number {
  const pricing = getModelPricing(modelId)
  return (
    (tokensIn * pricing.input) +
    (tokensOut * pricing.output) +
    (cacheTokens * pricing.cache)
  )
}
