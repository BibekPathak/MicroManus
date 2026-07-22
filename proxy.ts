import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isApi = pathname.startsWith("/api")
  const isStatic = pathname.startsWith("/_next") || pathname.startsWith("/favicon")
  const isCallback = pathname.startsWith("/auth/callback")

  if (isStatic || isApi || isCallback) {
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

  const isLogin = pathname === "/login"
  const isPublic = isLogin

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone()
    url.pathname = "/chat"
    return NextResponse.redirect(url)
  }

  if (user && pathname.startsWith("/chat")) {
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
