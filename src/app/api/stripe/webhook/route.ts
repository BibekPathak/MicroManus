import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import Stripe from "stripe"

export async function POST(request: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-06-24.dahlia",
    })

    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id

      if (userId) {
        const supabase = createAdminClient()
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          amount: 5,
          type: "payment",
          description: "Stripe payment - 5 credits",
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Stripe webhook error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
