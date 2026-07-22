const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search"

export interface BraveSearchResult {
  title: string
  url: string
  description: string
}

export async function braveSearch(query: string): Promise<BraveSearchResult[]> {
  const apiKey = process.env.BRAVE_API_KEY
  if (!apiKey) {
    throw new Error("BRAVE_API_KEY is not set")
  }

  const res = await fetch(`${BRAVE_API_URL}?q=${encodeURIComponent(query)}&count=5`, {
    headers: {
      "Accept": "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  })

  if (!res.ok) {
    throw new Error(`Brave search failed: ${res.statusText}`)
  }

  const data = await res.json()
  return (data.web?.results || []).map((r: any) => ({
    title: r.title,
    url: r.url,
    description: r.description,
  }))
}

export async function fetchPageContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MicroManus/1.0)",
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return ""

    const html = await res.text()
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000)

    return text
  } catch {
    return ""
  }
}

export async function searchAndSummarize(query: string): Promise<string> {
  const results = await braveSearch(query)

  const summaries = await Promise.all(
    results.slice(0, 3).map(async (r) => {
      const content = await fetchPageContent(r.url)
      return `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.description}\nContent: ${content.slice(0, 2000)}`
    })
  )

  return summaries.join("\n\n---\n\n")
}
