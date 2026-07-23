import { createClient } from "@/lib/supabase/client"

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  document.cookie = "sb-token=; path=/; max-age=0"
}
