import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/server"
import DashboardLayoutClient from "./layout-client"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const sbToken = cookieStore.get("sb-token")?.value

  if (!sbToken) {
    redirect("/login")
  }

  const supabase = createAdminClient()
  const { data: { user }, error } = await supabase.auth.getUser(sbToken)

  if (error || !user) {
    redirect("/login")
  }

  return <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>
}
