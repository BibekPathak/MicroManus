import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get("provider") || "google"
  const origin = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get("host")}`

  const response = NextResponse.json({})

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              path: "/",
              sameSite: "lax",
              httpOnly: false,
              secure: true,
              ...options,
            })
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as "google" | "github",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error || !data.url) {
    return NextResponse.json({ error: error?.message || "Failed to start OAuth" }, { status: 500 })
  }

  return NextResponse.json({ url: data.url })
}
