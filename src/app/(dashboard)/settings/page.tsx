"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Key, Trash2, Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/hooks/use-user"

const PROVIDERS = [
  { value: "gpt-4o", label: "OpenAI - GPT-4o", endpoint: "https://api.openai.com/v1" },
  { value: "gpt-4o-mini", label: "OpenAI - GPT-4o Mini", endpoint: "https://api.openai.com/v1" },
  { value: "claude-sonnet-4-20250514", label: "Anthropic - Claude Sonnet 4", endpoint: "https://api.anthropic.com/v1" },
  { value: "claude-haiku-3-5-20241022", label: "Anthropic - Claude Haiku 3.5", endpoint: "https://api.anthropic.com/v1" },
  { value: "kimi-k2", label: "Moonshot - Kimi K2", endpoint: "https://api.moonshot.cn/v1" },
]

interface SavedKey {
  id: string
  provider: string
  endpoint: string
  created_at: string
}

export default function SettingsPage() {
  const supabase = createClient()
  const [savedKeys, setSavedKeys] = useState<SavedKey[]>([])
  const [provider, setProvider] = useState("gpt-4o")
  const [endpoint, setEndpoint] = useState("https://api.openai.com/v1")
  const [apiKey, setApiKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadKeys()
  }, [])

  async function loadKeys() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", user.id)
    if (data) setSavedKeys(data)
  }

  function handleProviderChange(value: string | null) {
    if (!value) return
    setProvider(value)
    const prov = PROVIDERS.find((p) => p.value === value)
    if (prov) setEndpoint(prov.endpoint)
  }

  async function handleSave() {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, endpoint, key: apiKey }),
      })
      if (res.ok) {
        toast.success("API key saved")
        setApiKey("")
        await loadKeys()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to save key")
      }
    } catch {
      toast.error("Failed to save API key")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(keyId: string) {
    const { error } = await supabase.from("api_keys").delete().eq("id", keyId)
    if (error) {
      toast.error("Failed to delete key")
    } else {
      toast.success("API key deleted")
      setSavedKeys((prev) => prev.filter((k) => k.id !== keyId))
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your API keys and preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              Add API keys for the models you want to use. Keys are encrypted at rest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">API Endpoint</label>
              <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1"
                />
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            {savedKeys.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <h3 className="text-sm font-medium">Saved Keys</h3>
                {savedKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{key.provider}</p>
                      <p className="text-xs text-muted-foreground">{key.endpoint}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setVisibleKeys((prev) => {
                            const next = new Set(prev)
                            if (next.has(key.id)) next.delete(key.id)
                            else next.add(key.id)
                            return next
                          })
                        }}
                      >
                        {visibleKeys.has(key.id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
