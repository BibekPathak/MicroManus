import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { code } = await request.json()

    if (!code || code !== "SID_DRDROID") {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "coupon")

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Coupon already redeemed" }, { status: 400 })
    }

    const { error } = await supabase.from("credit_transactions").insert({
      user_id: user.id,
      amount: 5,
      type: "coupon",
      description: "Coupon code SID_DRDROID",
    })

    if (error) throw error

    return NextResponse.json({ success: true, credits: 5 })
  } catch (error: any) {
    console.error("Coupon error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
