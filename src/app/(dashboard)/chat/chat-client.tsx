"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Plus,
  Send,
  Trash2,
  Search,
  FileText,
  Loader2,
  Brain,
  Sparkles,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Chat } from "@/types"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

interface ChatClientProps {
  userId: string
  initialChats: Chat[]
}

const SUPPORTED_MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-haiku-3-5-20241022", label: "Claude Haiku 3.5" },
  { value: "kimi-k2", label: "Kimi K2" },
]

const STATUS_MESSAGES: Record<string, string> = {
  searching: "Searching...",
  reading: "Reading...",
  thinking: "Thinking...",
  writing: "Writing...",
  generating: "Generating report...",
}

export default function ChatClient({ userId, initialChats }: ChatClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [chats, setChats] = useState<Chat[]>(initialChats)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [model, setModel] = useState("gpt-4o")
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [apiEndpoint, setApiEndpoint] = useState("https://api.openai.com/v1")
  const [savedKeys, setSavedKeys] = useState<Array<{ provider: string; endpoint: string }>>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    loadSavedKeys()
  }, [])

  async function loadSavedKeys() {
    const { data } = await supabase
      .from("api_keys")
      .select("provider, endpoint")
      .eq("user_id", userId)

    if (data) {
      setSavedKeys(data)
      if (data.length > 0) {
        const first = data[0]
        setApiEndpoint(first.endpoint)
        setShowApiKeyDialog(true)
      } else {
        setShowApiKeyDialog(true)
      }
    }
  }

  async function loadMessages(chatId: string) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })

    if (data) {
      setMessages(
        data.map((m: any) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          created_at: m.created_at,
        }))
      )
    }
  }

  async function createNewChat() {
    const { data, error } = await supabase
      .from("chats")
      .insert({
        user_id: userId,
        title: "New Chat",
        model,
      })
      .select()
      .single()

    if (error) {
      toast.error("Failed to create chat")
      return
    }

    setChats((prev) => [data, ...prev])
    setCurrentChatId(data.id)
    setMessages([])
    setPdfUrl(null)
  }

  async function deleteChat(chatId: string, e: React.MouseEvent) {
    e.stopPropagation()
    await supabase.from("messages").delete().eq("chat_id", chatId)
    await supabase.from("chats").delete().eq("id", chatId)
    setChats((prev) => prev.filter((c) => c.id !== chatId))
    if (currentChatId === chatId) {
      setCurrentChatId(null)
      setMessages([])
    }
  }

  async function selectChat(chatId: string) {
    setCurrentChatId(chatId)
    await loadMessages(chatId)
    setPdfUrl(null)
  }

  async function getApiKeyValue(provider: string): Promise<string | null> {
    const { data } = await supabase
      .from("api_keys")
      .select("encrypted_key")
      .eq("user_id", userId)
      .eq("provider", provider)
      .single()

    if (!data) return null
    // Decrypt on server via API
    const res = await fetch("/api/keys/decrypt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId: data.encrypted_key }),
    })
    if (!res.ok) return null
    const { key } = await res.json()
    return key
  }

  async function handleSend() {
    if (!input.trim() || isLoading) return

    if (!currentChatId) {
      await createNewChat()
    }

    if (!apiKey) {
      setShowApiKeyDialog(true)
      toast.error("Please set your API key first")
      return
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setPdfUrl(null)

    const chatId = currentChatId!

    await supabase.from("messages").insert({
      chat_id: chatId,
      role: "user",
      content: userMessage.content,
    })

    setStatus("thinking")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          message: userMessage.content,
          model,
          apiKey,
          endpoint: apiEndpoint,
          messageHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Request failed")
      }

      const data = await res.json()

      setStatus("writing")

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      await supabase.from("messages").insert({
        chat_id: chatId,
        role: "assistant",
        content: data.response,
        tokens_in: data.tokensIn,
        tokens_out: data.tokensOut,
        cache_tokens: data.cacheTokens,
        cost: data.cost,
      })

      if (data.pdfRequest) {
        setPdfUrl(`/api/pdf?chatId=${chatId}&title=${encodeURIComponent(data.pdfRequest.title)}&content=${encodeURIComponent(data.pdfRequest.content)}`)
      }

      // Auto-generate title if first message
      if (messages.length === 0) {
        const title = input.trim().slice(0, 60) + (input.trim().length > 60 ? "..." : "")
        await supabase.from("chats").update({ title }).eq("id", chatId)
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, title } : c))
        )
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to get response")
    } finally {
      setIsLoading(false)
      setStatus(null)
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 border-r flex flex-col bg-muted/30">
        <div className="p-3 border-b">
          <Button
            variant="default"
            className="w-full gap-2"
            onClick={createNewChat}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                currentChatId === chat.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50 text-muted-foreground"
              }`}
              onClick={() => selectChat(chat.id)}
            >
              <span className="truncate flex-1">{chat.title}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => deleteChat(chat.id, e)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentChatId ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}

              {status && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {status === "searching" && <Search className="h-4 w-4 animate-pulse" />}
                      {status === "reading" && <FileText className="h-4 w-4 animate-pulse" />}
                      {status === "thinking" && <Brain className="h-4 w-4 animate-pulse" />}
                      {status === "writing" && <Sparkles className="h-4 w-4 animate-pulse" />}
                      {status === "generating" && <Loader2 className="h-4 w-4 animate-spin" />}
                      {STATUS_MESSAGES[status] || status}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* PDF Download */}
            {pdfUrl && (
              <div className="px-4 py-2 border-t bg-muted/30">
                <a
                  href={pdfUrl}
                  target="_blank"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  Download Research Report (PDF)
                </a>
              </div>
            )}

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Ask MicroManus to research anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    className="min-h-[44px] resize-none"
                    disabled={isLoading}
                  />
                  <div className="flex items-center justify-between">
                    <Select value={model} onValueChange={(v: string | null) => v && setModel(v)}>
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={isLoading || !input.trim()}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-6xl">🔬</div>
              <h2 className="text-2xl font-semibold">MicroManus</h2>
              <p className="text-muted-foreground max-w-md">
                Deep research AI agent. Start a new chat to begin researching any topic.
              </p>
              <Button onClick={createNewChat} className="gap-2">
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Your API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <Select value={model} onValueChange={(v: string | null) => v && setModel(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Endpoint</label>
              <Input
                placeholder="https://api.openai.com/v1"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={async () => {
                  if (!apiKey) return
                  const res = await fetch("/api/keys", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      provider: model,
                      endpoint: apiEndpoint,
                      key: apiKey,
                    }),
                  })
                  if (res.ok) {
                    toast.success("API key saved")
                    setShowApiKeyDialog(false)
                  } else {
                    toast.error("Failed to save API key")
                  }
                }}
              >
                Save Key
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setApiKey("")
                  setShowApiKeyDialog(false)
                }}
              >
                Use Once
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
