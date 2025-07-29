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

    console.log(`🔍 Starting full analysis for: ${targetUrl}`)

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

    // Extract links
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

    // CMS Detection
    const htmlLower = html.toLowerCase()
    const detected_systems: Record<string, any> = {}

    // WordPress detection
    let wp_score = 0
    const wp_evidence: string[] = []

    if (htmlLower.includes("wp-content")) {
      wp_score += 30
      wp_evidence.push("wp-content path found")
    }
    if (htmlLower.includes("wp-includes")) {
      wp_score += 25
      wp_evidence.push("wp-includes path found")
    }
    if ($('meta[name="generator"]').attr("content")?.toLowerCase().includes("wordpress")) {
      wp_score += 40
      wp_evidence.push("WordPress generator meta tag")
    }

    if (wp_score > 0) {
      detected_systems["WordPress"] = {
        confidence: Math.min(wp_score, 100),
        evidence: wp_evidence,
        detected: wp_score >= 30,
      }
    }

    // Other CMS detection
    if (htmlLower.includes("shopify") || htmlLower.includes("cdn.shopify")) {
      detected_systems["Shopify"] = {
        confidence: 85,
        evidence: ["Shopify platform detected"],
        detected: true,
      }
    }

    if (htmlLower.includes("drupal")) {
      detected_systems["Drupal"] = {
        confidence: 80,
        evidence: ["Drupal references found"],
        detected: true,
      }
    }

    // Analytics Detection
    const analytics_tools: Record<string, any> = {}

    if (htmlLower.includes("google-analytics") || htmlLower.includes("gtag(") || htmlLower.includes("ga(")) {
      analytics_tools["Google Analytics"] = {
        detected: true,
        confidence: 90,
        evidence: ["Google Analytics script detected"],
        category: "Analytics",
      }
    }

    if (htmlLower.includes("googletagmanager")) {
      analytics_tools["Google Tag Manager"] = {
        detected: true,
        confidence: 90,
        evidence: ["GTM script detected"],
        category: "Tag Management",
      }
    }

    if (htmlLower.includes("facebook.net") || htmlLower.includes("fbq(")) {
      analytics_tools["Facebook Pixel"] = {
        detected: true,
        confidence: 85,
        evidence: ["Facebook tracking detected"],
        category: "Social Media",
      }
    }

    // Elements Analysis
    const headings: Record<string, number> = {}
    const heading_content: Record<string, string[]> = {}

    for (let i = 1; i <= 6; i++) {
      const elements = $(`h${i}`)
      headings[`h${i}`] = elements.length
      heading_content[`h${i}`] = elements
        .map((_, el) => $(el).text().trim().substring(0, 50))
        .get()
        .slice(0, 3)
    }

    const images = $("img")
    const images_without_alt = images.filter((_, img) => !$(img).attr("alt")).length
    const images_with_alt = images.length - images_without_alt

    const forms = $("form")
    const form_details = forms
      .map((_, form) => ({
        action: $(form).attr("action") || "",
        method: $(form).attr("method") || "GET",
        inputs: $(form).find("input").length,
        textareas: $(form).find("textarea").length,
        selects: $(form).find("select").length,
        buttons: $(form).find('button, input[type="submit"]').length,
      }))
      .get()

    // Meta tags analysis
    const important_meta: Record<string, string> = {}
    $("meta").each((_, meta) => {
      const name = $(meta).attr("name") || $(meta).attr("property")
      const content = $(meta).attr("content")
      if (name && content) {
        const nameLower = name.toLowerCase()
        if (["description", "keywords", "author", "viewport", "robots"].includes(nameLower)) {
          important_meta[nameLower] = content.substring(0, 100)
        }
      }
    })

    // Accessibility score calculation
    let accessibility_issues = 0
    accessibility_issues += images_without_alt
    accessibility_issues += $("a").filter((_, link) => !$(link).text().trim() && !$(link).attr("aria-label")).length

    const accessibility_score = Math.max(0, 100 - accessibility_issues * 5)

    const results = {
      url: targetUrl,
      timestamp: new Date().toISOString(),
      status: "success",
      total_links: internal_links.length + external_links.length,
      internal_links,
      external_links,
      cms_detected: {
        primary_cms: Object.keys(detected_systems).find((cms) => detected_systems[cms].detected) || null,
        detected_systems,
        total_detected: Object.values(detected_systems).filter((sys: any) => sys.detected).length,
      },
      analytics_tools: {
        detected_tools: analytics_tools,
        total_detected: Object.values(analytics_tools).filter((tool: any) => tool.detected).length,
      },
      elements: {
        headings: {
          structure: headings,
          content_sample: heading_content,
          total_headings: Object.values(headings).reduce((a, b) => a + b, 0),
          has_h1: headings.h1 > 0,
          multiple_h1: headings.h1 > 1,
        },
        images: {
          total_images: images.length,
          with_alt_text: images_with_alt,
          missing_alt_text: images_without_alt,
          alt_text_percentage: images.length > 0 ? (images_with_alt / images.length) * 100 : 0,
        },
        forms: {
          total_forms: forms.length,
          form_details,
          total_inputs: form_details.reduce((sum, form) => sum + form.inputs, 0),
          total_buttons: form_details.reduce((sum, form) => sum + form.buttons, 0),
        },
        links: {
          total_links: internal_links.length + external_links.length,
          internal_links: internal_links.length,
          external_links: external_links.length,
          email_links: $('a[href^="mailto:"]').length,
          phone_links: $('a[href^="tel:"]').length,
          social_platforms: [],
        },
        meta_tags: {
          total_meta_tags: $("meta").length,
          important_tags: important_meta,
          has_description: "description" in important_meta,
          has_viewport: "viewport" in important_meta,
        },
        accessibility: {
          score: accessibility_score,
          issues_found: accessibility_issues,
          images_without_alt: images_without_alt,
          links_without_text: $("a").filter((_, link) => !$(link).text().trim()).length,
        },
      },
    }

    console.log(`✅ Full analysis complete for ${targetUrl}`)
    return NextResponse.json(results)
  } catch (error) {
    console.error("Full analysis API error:", error)
    return NextResponse.json(
      { error: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
