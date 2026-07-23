import { createClient } from "@supabase/supabase-js"
import type { User } from "@supabase/supabase-js"

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function getUserFromRequest(request: Request): Promise<User | null> {
  const cookieHeader = request.headers.get("cookie") || ""
  const match = cookieHeader.match(/sb-token=([^;]+)/)
  const token = match ? decodeURIComponent(match[1]) : null

  if (!token) return null

  const supabase = createAdminClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

export async function getUserFromToken(token: string): Promise<User | null> {
  const supabase = createAdminClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}
