import { auth } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

async function getCredits(userId: string): Promise<number> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("credit_transactions")
      .select("amount")
      .eq("user_id", userId)
    return data
      ? data.reduce((sum: number, tx: { amount: number }) => sum + (tx.amount || 0), 0)
      : 0
  } catch {
    return 0
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isApi = pathname.startsWith("/api")
  const isStatic = pathname.startsWith("/_next") || pathname.startsWith("/favicon")
  const isPublic = pathname === "/login" || pathname.startsWith("/api/auth")

  if (isStatic || isApi || isPublic) {
    return NextResponse.next()
  }

  const session = await auth()

  if (!session?.user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (pathname === "/login" && session.user) {
    const url = request.nextUrl.clone()
    url.pathname = "/chat"
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith("/chat")) {
    const credits = await getCredits(session.user.id!)
    if (credits <= 0) {
      const url = request.nextUrl.clone()
      url.pathname = "/paywall"
      return NextResponse.redirect(url)
    }
  }

  if (pathname === "/paywall") {
    const credits = await getCredits(session.user.id!)
    if (credits > 0) {
      const url = request.nextUrl.clone()
      url.pathname = "/chat"
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
