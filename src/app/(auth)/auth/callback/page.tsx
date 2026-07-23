"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()

      // Let Supabase auto-detect the code in the URL and exchange it
      // createBrowserClient has detectSessionInUrl: true by default
      await new Promise((r) => setTimeout(r, 2000))

      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login?error=no_session")
        return
      }

      // Sync access token to a simple cookie so the proxy can read it
      document.cookie = `sb-token=${session.access_token}; path=/; max-age=86400; sameSite=lax; secure`
      // Also set a flag for Supabase's SSR cookies
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login?error=no_user")
        return
      }

      // Hard navigation so proxy reads the new cookie
      window.location.href = "/chat"
    }

    handleCallback()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Completing sign in...
      </div>
    </div>
  )
}
