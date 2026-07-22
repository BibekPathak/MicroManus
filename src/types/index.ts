export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Profile {
  id: string
  email: string
  name: string
  avatar_url: string | null
  created_at: string
}

export interface Chat {
  id: string
  user_id: string
  title: string
  model: string
  total_cost: number
  created_at: string
}

export interface Message {
  id: string
  chat_id: string
  role: "user" | "assistant" | "tool"
  content: string
  tokens_in: number
  tokens_out: number
  cache_tokens: number
  cost: number
  created_at: string
}

export interface ApiKey {
  id: string
  user_id: string
  provider: string
  endpoint: string
  created_at: string
}

export interface CreditTransaction {
  id: string
  user_id: string
  amount: number
  type: "coupon" | "payment" | "usage"
  description: string
  created_at: string
}
