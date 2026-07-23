import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { encrypt } from "@/lib/encryption"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("api_keys")
    .select("id, provider, endpoint, created_at")
    .eq("user_id", session.user.id)

  return NextResponse.json({ keys: data || [] })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createAdminClient()
  const { provider, endpoint, key } = await request.json()
  if (!provider || !endpoint || !key) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const encryptedKey = await encrypt(key)
  await supabase.from("api_keys").upsert(
    { user_id: session.user.id, provider, endpoint, encrypted_key: encryptedKey },
    { onConflict: "user_id, provider" }
  )

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const keyId = searchParams.get("id")
  if (!keyId) return NextResponse.json({ error: "Missing key id" }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from("api_keys").delete().eq("id", keyId).eq("user_id", session.user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
