import { createServerSupabaseClient } from "@/lib/supabase/server"
import ChatClient from "./chat-client"

export default async function ChatPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: chats } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50)

  return <ChatClient userId={user!.id} initialChats={chats || []} />
}
