
import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 })

    const targetUrl = url.startsWith("http") ? url : "https://" + url
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 0 }
    })
    const html = await response.text()
    const $ = cheerio.load(html)
    const forms: string[] = []
    $("form").each((i, form) => {
      const formId = $(form).attr("id") || `form${i}`
      forms.push(`${targetUrl}#${formId}`)
    })
    return NextResponse.json({ forms }, { status: 200 })
  } catch (err) {
    return NextResponse.json({ error: "Form extraction failed" }, { status: 500 })
  }
}
