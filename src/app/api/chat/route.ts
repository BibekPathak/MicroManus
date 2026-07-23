import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { runAgent } from "@/lib/ai/agent"
import { calculateCost } from "@/lib/pricing"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const user = session.user

    const { chatId, message, model, apiKey, endpoint, messageHistory } = await request.json()

    if (!chatId || !message || !apiKey) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data: transactions } = await supabase
      .from("credit_transactions")
      .select("amount")
      .eq("user_id", user.id)

    const credits = transactions
      ? transactions.reduce((sum: number, tx: { amount: number }) => sum + (tx.amount || 0), 0)
      : 0

    if (credits <= 0) {
      return NextResponse.json({ error: "No credits remaining. Please purchase more." }, { status: 403 })
    }

    const agentResult = await runAgent({
      messages: [
        ...(messageHistory || []),
        { role: "user", content: message },
      ],
      model,
      apiKey,
      endpoint,
      tokensIn: 0,
      tokensOut: 0,
      cacheTokens: 0,
    })

    const cost = calculateCost(
      model,
      agentResult.tokensIn,
      agentResult.tokensOut,
      agentResult.cacheTokens
    )

    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      amount: -cost,
      type: "usage",
      description: `Chat ${chatId} - ${model}`,
    })

    // Update chat total cost
    const { data: chatData } = await supabase
      .from("chats")
      .select("total_cost")
      .eq("id", chatId)
      .single()

    await supabase
      .from("chats")
      .update({ total_cost: (chatData?.total_cost || 0) + cost })
      .eq("id", chatId)

    if (agentResult.pdfRequest) {
      const { data: chat } = await supabase
        .from("chats")
        .select("title")
        .eq("id", chatId)
        .single()

      if (chat) {
        await supabase
          .from("chats")
          .update({ title: agentResult.pdfRequest.title.slice(0, 100) })
          .eq("id", chatId)
      }
    }

    return NextResponse.json({
      response: agentResult.response,
      pdfRequest: agentResult.pdfRequest,
      tokensIn: agentResult.tokensIn,
      tokensOut: agentResult.tokensOut,
      cacheTokens: agentResult.cacheTokens,
      cost,
    })
  } catch (error: any) {
    console.error("Chat error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
