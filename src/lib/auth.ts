import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function signInWithGoogle() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  return { data, error }
}

export async function signInWithGithub() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  return { data, error }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}

export async function getCredits(userId: string): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from("credit_transactions")
    .select("amount")
    .eq("user_id", userId)

  if (!data) return 0
  return data.reduce((sum, tx) => sum + (tx.amount || 0), 0)
}

export type SupabaseClientType = Awaited<ReturnType<typeof import("@/lib/supabase/server")["createServerSupabaseClient"]>>

export async function getServerCredits(userId: string, supabase: SupabaseClientType): Promise<number> {
  const { data } = await supabase
    .from("credit_transactions")
    .select("amount")
    .eq("user_id", userId)

  if (!data) return 0
  return data.reduce((sum: number, tx: { amount: number }) => sum + (tx.amount || 0), 0)
}
