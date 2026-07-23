import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/server"
import ChatClient from "./chat-client"

export default async function ChatPage() {
  const session = await auth()

  if (!session?.user?.id) redirect("/login")

  const supabase = createAdminClient()
  const { data: chats } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  return <ChatClient userId={session.user.id} initialChats={chats || []} />
}
