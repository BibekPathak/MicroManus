"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { CreditCard, Ticket } from "lucide-react"

export default function PaywallPage() {
  const router = useRouter()
  const [couponCode, setCouponCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(false)

  async function handleRedeemCoupon() {
    if (!couponCode.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Coupon redeemed! You now have 5 credits.")
        router.push("/chat")
      } else {
        toast.error(data.error || "Invalid coupon")
      }
    } catch {
      toast.error("Failed to redeem coupon")
    } finally {
      setLoading(false)
    }
  }

  async function handleStripeCheckout() {
    setStripeLoading(true)
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error("Failed to create checkout session")
      }
    } catch {
      toast.error("Failed to create checkout session")
    } finally {
      setStripeLoading(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Get Started with MicroManus</CardTitle>
          <CardDescription>
            You need credits to use the deep research agent. Choose an option below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Button
              className="w-full h-14 text-base gap-3"
              onClick={handleStripeCheckout}
              disabled={stripeLoading}
            >
              <CreditCard className="h-5 w-5" />
              {stripeLoading ? "Redirecting..." : "Pay $5 — Get 5 Credits"}
            </Button>
          </div>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
              OR
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={handleRedeemCoupon}
                disabled={loading || !couponCode.trim()}
              >
                <Ticket className="h-4 w-4 mr-2" />
                {loading ? "..." : "Redeem"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Enter code <strong>SID_DRDROID</strong> for free credits
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
