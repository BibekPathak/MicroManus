import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isApi = pathname.startsWith("/api")
  const isStatic = pathname.startsWith("/_next") || pathname.startsWith("/favicon")
  const isPublic = pathname === "/login" || pathname.startsWith("/auth/callback")

  if (isStatic || isApi || isPublic) {
    return NextResponse.next()
  }

  // Check credits at the proxy level — read from a simple cookie
  const sbToken = request.cookies.get("sb-token")?.value

  if (!sbToken && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Check if user has credits for /chat routes
  if (pathname.startsWith("/chat") && sbToken) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser(sbToken)
    if (user) {
      const { data: transactions } = await supabase
        .from("credit_transactions")
        .select("amount")
        .eq("user_id", user.id)

      const credits = transactions
        ? transactions.reduce((sum: number, tx: { amount: number }) => sum + (tx.amount || 0), 0)
        : 0

      if (credits <= 0 && pathname !== "/paywall") {
        const url = request.nextUrl.clone()
        url.pathname = "/paywall"
        return NextResponse.redirect(url)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
