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
      const { searchParams } = new URL(window.location.href)
      const code = searchParams.get("code")

      if (!code) {
        router.push("/login?error=no_code")
        return
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        router.push(`/login?error=${encodeURIComponent(error.message)}`)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login?error=no_session")
        return
      }

      // Sync session to server-side cookies so the proxy can read them
      await fetch("/api/auth/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }),
      })

      // Hard navigation so the proxy picks up the new cookies
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
