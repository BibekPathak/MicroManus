import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { decrypt } from "@/lib/encryption"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { keyId } = await request.json()
    if (!keyId) {
      return NextResponse.json({ error: "Missing keyId" }, { status: 400 })
    }

    const decrypted = await decrypt(keyId)
    return NextResponse.json({ key: decrypted })
  } catch (error: any) {
    console.error("Decrypt error:", error)
    return NextResponse.json({ error: "Failed to decrypt key" }, { status: 500 })
  }
}
