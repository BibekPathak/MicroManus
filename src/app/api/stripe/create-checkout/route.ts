import { NextResponse } from "next/server"
import { createAdminClient, getUserFromRequest } from "@/lib/supabase/server"
import { createCheckoutSession } from "@/lib/stripe/client"

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient()
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const session = await createCheckoutSession(user.id)

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("Stripe checkout error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
