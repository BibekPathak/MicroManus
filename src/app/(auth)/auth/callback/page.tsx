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

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          router.push(`/login?error=${encodeURIComponent(error.message)}`)
          return
        }
      }

      // Check if session was established
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push("/chat")
      } else {
        router.push("/login?error=session_not_found")
      }
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
