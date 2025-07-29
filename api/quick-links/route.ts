import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    let targetUrl = url.trim()
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl
    }

    console.log(`🔗 Extracting links from: ${targetUrl}`)

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const baseDomain = new URL(targetUrl).hostname
    const internal_links: Array<{ url: string; text: string; title: string }> = []
    const external_links: Array<{ url: string; text: string; title: string }> = []

    $("a[href]").each((_, element) => {
      const href = $(element).attr("href")
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) {
        return
      }

      let absoluteUrl: string
      try {
        absoluteUrl = new URL(href, targetUrl).href
      } catch {
        return
      }

      const linkData = {
        url: absoluteUrl,
        text: $(element).text().trim().substring(0, 100),
        title: $(element).attr("title") || "",
      }

      const linkDomain = new URL(absoluteUrl).hostname
      if (linkDomain === baseDomain) {
        if (!internal_links.some((link) => link.url === absoluteUrl)) {
          internal_links.push(linkData)
        }
      } else {
        if (!external_links.some((link) => link.url === absoluteUrl)) {
          external_links.push(linkData)
        }
      }
    })

    console.log(`✅ Found ${internal_links.length} internal and ${external_links.length} external links`)

    return NextResponse.json({
      internal_links,
      external_links,
      total: internal_links.length + external_links.length,
      status: "success",
    })
  } catch (error) {
    console.error("Quick links API error:", error)
    return NextResponse.json(
      { error: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
