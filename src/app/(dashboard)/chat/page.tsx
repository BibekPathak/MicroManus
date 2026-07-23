import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createAdminClient, getUserFromToken } from "@/lib/supabase/server"
import ChatClient from "./chat-client"

export default async function ChatPage() {
  const cookieStore = await cookies()
  const sbToken = cookieStore.get("sb-token")?.value

  if (!sbToken) redirect("/login")

  const user = await getUserFromToken(sbToken)
  if (!user) redirect("/login")

  const supabase = createAdminClient()
  const { data: chats } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  return <ChatClient userId={user.id} initialChats={chats || []} />
}
