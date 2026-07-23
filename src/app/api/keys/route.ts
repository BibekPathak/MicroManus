import { NextResponse } from "next/server"
import { createAdminClient, getUserFromRequest } from "@/lib/supabase/server"
import { encrypt } from "@/lib/encryption"

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient()
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { provider, endpoint, key } = await request.json()

    if (!provider || !endpoint || !key) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const encryptedKey = await encrypt(key)

    await supabase.from("api_keys").upsert(
      {
        user_id: user.id,
        provider,
        endpoint,
        encrypted_key: encryptedKey,
      },
      { onConflict: "user_id, provider", ignoreDuplicates: false }
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Save key error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
