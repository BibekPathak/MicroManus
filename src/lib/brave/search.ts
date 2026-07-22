const TAVILY_API_URL = "https://api.tavily.com/search"

export interface TavilySearchResult {
  title: string
  url: string
  content: string
}

export async function tavilySearch(query: string): Promise<{
  results: TavilySearchResult[]
  answer: string | null
}> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not set")
  }

  const res = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      max_results: 5,
      include_answer: "advanced",
      include_raw_content: false,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Tavily search failed: ${res.status} ${err}`)
  }

  const data = await res.json()
  return {
    results: (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      content: r.content,
    })),
    answer: data.answer || null,
  }
}

export async function searchAndSummarize(query: string): Promise<string> {
  const { results, answer } = await tavilySearch(query)

  let output = ""
  if (answer) {
    output += `Summary: ${answer}\n\n`
  }

  output += "Sources:\n"
  for (const r of results) {
    output += `- ${r.title} (${r.url}): ${r.content.slice(0, 1000)}\n`
  }

  return output
}
