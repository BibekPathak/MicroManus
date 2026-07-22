import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const publicPaths = ["/login", "/auth/callback"]
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))
  const isApi = pathname.startsWith("/api")
  const isStatic = pathname.startsWith("/_next") || pathname.startsWith("/favicon")

  // Don't touch cookies on callback — client-side exchange needs them intact
  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next()
  }

  if (isStatic || isApi) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && isPublic && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/chat"
    return NextResponse.redirect(url)
  }

  if (user && !isPublic && pathname.startsWith("/chat")) {
    const { data: transactions } = await supabase
      .from("credit_transactions")
      .select("amount")

    const credits = transactions
      ? transactions.reduce((sum: number, tx: { amount: number }) => sum + (tx.amount || 0), 0)
      : 0

    if (credits <= 0) {
      const url = request.nextUrl.clone()
      url.pathname = "/paywall"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
