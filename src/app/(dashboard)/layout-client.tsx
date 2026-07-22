"use client"

import { useRouter, usePathname } from "next/navigation"
import { signOut } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { MessageSquare, Settings, BarChart3, LogOut, Microscope } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { User } from "@supabase/supabase-js"

export default function DashboardLayoutClient({
  children,
  user,
}: {
  children: React.ReactNode
  user: User
}) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { href: "/chat", label: "Chats", icon: MessageSquare },
    { href: "/stats", label: "Stats", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r bg-background flex flex-col">
        <div className="p-4 border-b">
          <Link href="/chat" className="flex items-center gap-2 text-lg font-semibold">
            <Microscope className="h-5 w-5" />
            MicroManus
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-2 border-t">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">
            {user.email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={async () => {
              await signOut()
              router.push("/login")
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
