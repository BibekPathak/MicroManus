import { NextResponse } from "next/server"
import { createAdminClient, getUserFromRequest } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient()
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: txns } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)

    const creditsRemaining = txns
      ? txns.reduce((sum: number, tx: { amount: number }) => sum + (tx.amount || 0), 0)
      : 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayTxns = txns?.filter(
      (tx: { created_at: string }) => new Date(tx.created_at) >= today
    ) || []

    const totalSpend = -(txns?.filter((tx: { amount: number }) => tx.amount < 0)
      .reduce((sum: number, tx: { amount: number }) => sum + (tx.amount || 0), 0) || 0)

    const todaySpend = -(todayTxns
      .filter((tx: { amount: number }) => tx.amount < 0)
      .reduce((sum: number, tx: { amount: number }) => sum + (tx.amount || 0), 0) || 0)

    const { data: chats } = await supabase
      .from("chats")
      .select(`
        id, title, model, total_cost, created_at
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    const { data: messages } = await supabase
      .from("messages")
      .select("chat_id, tokens_in, tokens_out, cache_tokens, cost, created_at")
      .in(
        "chat_id",
        (chats || []).map((c: { id: string }) => c.id)
      )

    const messagesByChat: Record<string, any[]> = {}
    for (const msg of messages || []) {
      if (!messagesByChat[msg.chat_id]) messagesByChat[msg.chat_id] = []
      messagesByChat[msg.chat_id].push(msg)
    }

    const chatStats = (chats || []).map((chat: any) => {
      const chatMessages = messagesByChat[chat.id] || []
      return {
        id: chat.id,
        title: chat.title,
        model: chat.model,
        total_cost: chat.total_cost,
        created_at: chat.created_at,
        message_count: chatMessages.length,
        total_tokens_in: chatMessages.reduce((s: number, m: any) => s + (m.tokens_in || 0), 0),
        total_tokens_out: chatMessages.reduce((s: number, m: any) => s + (m.tokens_out || 0), 0),
        total_cache_tokens: chatMessages.reduce((s: number, m: any) => s + (m.cache_tokens || 0), 0),
      }
    })

    const modelUsage: Record<string, number> = {}
    for (const chat of chats || []) {
      modelUsage[chat.model] = (modelUsage[chat.model] || 0) + (messagesByChat[chat.id]?.length || 0)
    }

    const cacheSaved = messages?.reduce(
      (sum: number, m: any) => sum + (m.cost ? m.cost * 0.5 : 0),
      0
    ) || 0

    return NextResponse.json({
      chats: chatStats,
      dashboard: {
        totalSpend,
        todaySpend,
        creditsRemaining,
        totalMessages: messages?.length || 0,
        modelUsage,
        cacheSaved,
      },
    })
  } catch (error: any) {
    console.error("Stats error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
