import Stripe from "stripe"

export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-06-24.dahlia",
  })
}

export async function createCheckoutSession(userId: string) {
  const stripe = getStripe()

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "5 MicroManus Credits",
            description: "5 credits for the MicroManus deep research agent",
          },
          unit_amount: 500,
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: userId,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/chat`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/paywall`,
  })

  return session
}
