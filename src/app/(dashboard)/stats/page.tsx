"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Coins, DollarSign, BarChart3, Cpu, Database, Zap } from "lucide-react"

interface ChatStats {
  id: string
  title: string
  model: string
  total_cost: number
  created_at: string
  message_count: number
  total_tokens_in: number
  total_tokens_out: number
  total_cache_tokens: number
}

interface DashboardStats {
  totalSpend: number
  todaySpend: number
  creditsRemaining: number
  totalMessages: number
  modelUsage: Record<string, number>
  cacheSaved: number
}

export default function StatsPage() {
  const [chats, setChats] = useState<ChatStats[]>([])
  const [dashboard, setDashboard] = useState<DashboardStats>({
    totalSpend: 0,
    todaySpend: 0,
    creditsRemaining: 0,
    totalMessages: 0,
    modelUsage: {},
    cacheSaved: 0,
  })

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    const res = await fetch("/api/stats")
    if (res.ok) {
      const data = await res.json()
      setChats(data.chats || [])
      setDashboard(data.dashboard || {})
    }
  }

  function formatCost(cost: number): string {
    return `$${cost.toFixed(6)}`
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Usage & Stats</h1>
          <p className="text-muted-foreground">Track your MicroManus usage and costs</p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Credits Remaining
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{dashboard.creditsRemaining.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Spend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCost(dashboard.totalSpend)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Today's Spend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCost(dashboard.todaySpend)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Total Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{dashboard.totalMessages}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Models Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {Object.keys(dashboard.modelUsage).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Database className="h-4 w-4" />
                Cache Saved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCost(dashboard.cacheSaved)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Model Usage Breakdown */}
        {Object.keys(dashboard.modelUsage).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Model Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(dashboard.modelUsage).map(([model, count]) => (
                  <div key={model} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{model}</span>
                    <Badge variant="secondary">{count} messages</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Per-Chat Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chat History</CardTitle>
          </CardHeader>
          <CardContent>
            {chats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No chats yet</p>
            ) : (
              <div className="space-y-3">
                {chats.map((chat) => (
                  <div key={chat.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{chat.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {chat.model} · {chat.message_count} messages · {new Date(chat.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm font-mono ml-4">{formatCost(chat.total_cost)}</p>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>In: {chat.total_tokens_in.toLocaleString()}</span>
                      <span>Out: {chat.total_tokens_out.toLocaleString()}</span>
                      <span>Cache: {chat.total_cache_tokens.toLocaleString()}</span>
                    </div>
                    <Separator className="mt-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
