import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DashboardLayoutClient from "./layout-client"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>
}
