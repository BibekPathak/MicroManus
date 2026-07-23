import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createAdminClient()
  const { id, title, model, action } = await request.json()

  if (action === "delete") {
    await supabase.from("messages").delete().eq("chat_id", id)
    const { error } = await supabase.from("chats").delete().eq("id", id).eq("user_id", session.user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === "messages") {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", id)
      .order("created_at", { ascending: true })
    return NextResponse.json({ messages: data || [] })
  }

  // Create new chat
  const { data, error } = await supabase
    .from("chats")
    .insert({ user_id: session.user.id, title: title || "New Chat", model: model || "gpt-4o" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ chat: data })
}
