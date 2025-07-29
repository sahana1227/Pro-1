import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Validate URL format
    let targetUrl: URL
    try {
      targetUrl = new URL(url)
    } catch (error) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    console.log(`Starting deep analysis for: ${targetUrl.href}`)

    // Step 1: Get the main page and extract internal links
    const mainPageResponse = await fetch(targetUrl.href, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!mainPageResponse.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch main page: ${mainPageResponse.status} ${mainPageResponse.statusText}`,
        },
        { status: 400 },
      )
    }

    const mainPageHtml = await mainPageResponse.text()
    const $ = cheerio.load(mainPageHtml)

    // Extract internal links
    const internalLinks: Array<{ url: string; text: string; title: string }> = []
    const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`

    $("a[href]").each((_, element) => {
      const href = $(element).attr("href")
      const text = $(element).text().trim()
      const title = $(element).attr("title") || ""

      if (href) {
        let fullUrl: string

        if (href.startsWith("http")) {
          // Absolute URL - check if it's internal
          if (href.startsWith(baseUrl)) {
            fullUrl = href
          } else {
            return // Skip external links
          }
        } else if (href.startsWith("/")) {
          // Root-relative URL
          fullUrl = baseUrl + href
        } else if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
          // Skip anchors, mailto, and tel links
          return
        } else {
          // Relative URL
          fullUrl = new URL(href, targetUrl.href).href
        }

        // Only include if it's truly internal and not already added
        if (fullUrl.startsWith(baseUrl) && !internalLinks.some((link) => link.url === fullUrl)) {
          internalLinks.push({
            url: fullUrl,
            text: text.substring(0, 100), // Limit text length
            title: title.substring(0, 100),
          })
        }
      }
    })

    console.log(`Found ${internalLinks.length} internal links`)

    // Step 2: Analyze each internal link (limit to prevent timeouts)
    const maxLinksToAnalyze = 15
    const linksToAnalyze = internalLinks.slice(0, maxLinksToAnalyze)
    const analyzedData: Array<any> = []
    const failedData: Array<any> = []

    for (const link of linksToAnalyze) {
      try {
        console.log(`Analyzing: ${link.url}`)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout per page

        const response = await fetch(link.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          failedData.push({
            url: link.url,
            text: link.text,
            error: `HTTP ${response.status}`,
            status: "❌",
          })
          continue
        }

        const html = await response.text()
        const page$ = cheerio.load(html)

        // Analyze elements on this page
        const elements = {
          buttons: page$('button, input[type="button"], input[type="submit"], .btn, [role="button"]').length,
          forms: page$("form").length,
          images: page$("img").length,
          headings: page$("h1, h2, h3, h4, h5, h6").length,
          videos: page$('video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="youtu.be"]').length,
          calculators: 0,
          banners: 0,
          carousels: 0,
        }

        // Enhanced calculator detection
        const forms = page$("form")
        forms.each((_, form) => {
          const numberInputs = page$(form).find('input[type="number"], input[type="range"]').length
          const hasCalculatorKeywords = page$(form)
            .text()
            .toLowerCase()
            .match(/(calculat|compute|estimate|rate|loan|mortgage|tax|budget|cost)/i)
          if (numberInputs >= 2 || hasCalculatorKeywords) {
            elements.calculators++
          }
        })

        // Enhanced banner detection
        const bannerSelectors = [
          ".banner",
          ".hero",
          ".jumbotron",
          ".masthead",
          ".header-banner",
          '[class*="banner"]',
          '[class*="hero"]',
          '[id*="banner"]',
          '[id*="hero"]',
        ]
        elements.banners = page$(bannerSelectors.join(", ")).length

        // Also check for large images that might be banners
        page$("img").each((_, img) => {
          const src = page$(img).attr("src") || ""
          const alt = page$(img).attr("alt") || ""
          const className = page$(img).attr("class") || ""

          if (
            src.match(/(banner|hero|header)/i) ||
            alt.match(/(banner|hero|header)/i) ||
            className.match(/(banner|hero|header)/i)
          ) {
            elements.banners++
          }
        })

        // Enhanced carousel detection
        const carouselSelectors = [
          ".carousel",
          ".slider",
          ".swiper",
          ".slick",
          ".owl-carousel",
          '[class*="carousel"]',
          '[class*="slider"]',
          '[class*="swiper"]',
          '[data-ride="carousel"]',
          ".glide",
          ".splide",
        ]
        elements.carousels = page$(carouselSelectors.join(", ")).length

        // Calculate accessibility score
        const accessibilityScore = calculateAccessibilityScore(page$)

        // Calculate SEO score
        const seoScore = calculateSEOScore(page$)

        analyzedData.push({
          url: link.url,
          text: link.text,
          title: link.title,
          status: "✅",
          elements,
          accessibility_score: accessibilityScore,
          seo_score: seoScore,
        })
      } catch (error) {
        console.error(`Failed to analyze ${link.url}:`, error)
        failedData.push({
          url: link.url,
          text: link.text,
          error: error instanceof Error ? error.message : "Unknown error",
          status: "❌",
        })
      }
    }

    // Step 3: Calculate summary statistics
    const summary = {
      total_buttons: analyzedData.reduce((sum, page) => sum + (page.elements?.buttons || 0), 0),
      total_forms: analyzedData.reduce((sum, page) => sum + (page.elements?.forms || 0), 0),
      total_images: analyzedData.reduce((sum, page) => sum + (page.elements?.images || 0), 0),
      total_headings: analyzedData.reduce((sum, page) => sum + (page.elements?.headings || 0), 0),
      total_videos: analyzedData.reduce((sum, page) => sum + (page.elements?.videos || 0), 0),
      total_calculators: analyzedData.reduce((sum, page) => sum + (page.elements?.calculators || 0), 0),
      total_banners: analyzedData.reduce((sum, page) => sum + (page.elements?.banners || 0), 0),
      total_carousels: analyzedData.reduce((sum, page) => sum + (page.elements?.carousels || 0), 0),
      average_accessibility_score:
        analyzedData.length > 0
          ? analyzedData.reduce((sum, page) => sum + (page.accessibility_score || 0), 0) / analyzedData.length
          : 0,
      average_seo_score:
        analyzedData.length > 0
          ? analyzedData.reduce((sum, page) => sum + (page.seo_score || 0), 0) / analyzedData.length
          : 0,
      pages_with_forms: analyzedData.filter((page) => (page.elements?.forms || 0) > 0).length,
      pages_with_images: analyzedData.filter((page) => (page.elements?.images || 0) > 0).length,
    }

    const result = {
      base_url: baseUrl,
      url: targetUrl.href,
      timestamp: new Date().toISOString(),
      status: "completed",
      total_internal_links: internalLinks.length,
      analyzed_links: analyzedData.length,
      failed_links: failedData.length,
      analyzed_data: analyzedData,
      failed_data: failedData,
      summary,
    }

    console.log(`Deep analysis completed. Analyzed: ${analyzedData.length}, Failed: ${failedData.length}`)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Deep analysis error:", error)
    return NextResponse.json(
      {
        error: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}

function calculateAccessibilityScore(page$: cheerio.CheerioAPI): number {
  const score = 100
  let deductions = 0

  // Check images without alt text
  const images = page$("img")
  const imagesWithoutAlt = images.filter((_, img) => !page$(img).attr("alt")).length
  if (images.length > 0) {
    const altTextPercentage = ((images.length - imagesWithoutAlt) / images.length) * 100
    if (altTextPercentage < 100) {
      deductions += (100 - altTextPercentage) * 0.3 // 30% weight for alt text
    }
  }

  // Check for proper heading structure
  const h1Count = page$("h1").length
  if (h1Count === 0) {
    deductions += 15 // No H1 tag
  } else if (h1Count > 1) {
    deductions += 10 // Multiple H1 tags
  }

  // Check links without accessible names
  const links = page$("a[href]")
  const linksWithoutAccessibleName = links.filter((_, link) => {
    const $link = page$(link)
    const text = $link.text().trim()
    const ariaLabel = $link.attr("aria-label")
    const title = $link.attr("title")
    const ariaLabelledby = $link.attr("aria-labelledby")

    return !text && !ariaLabel && !title && !ariaLabelledby
  }).length

  if (links.length > 0) {
    const accessibleLinksPercentage = ((links.length - linksWithoutAccessibleName) / links.length) * 100
    if (accessibleLinksPercentage < 100) {
      deductions += (100 - accessibleLinksPercentage) * 0.2 // 20% weight for link accessibility
    }
  }

  // Check for form labels
  const inputs = page$(
    'input[type="text"], input[type="email"], input[type="password"], input[type="tel"], textarea, select',
  )
  const inputsWithoutLabels = inputs.filter((_, input) => {
    const $input = page$(input)
    const id = $input.attr("id")
    const ariaLabel = $input.attr("aria-label")
    const ariaLabelledby = $input.attr("aria-labelledby")
    const hasLabel = id && page$(`label[for="${id}"]`).length > 0

    return !hasLabel && !ariaLabel && !ariaLabelledby
  }).length

  if (inputs.length > 0) {
    const labeledInputsPercentage = ((inputs.length - inputsWithoutLabels) / inputs.length) * 100
    if (labeledInputsPercentage < 100) {
      deductions += (100 - labeledInputsPercentage) * 0.25 // 25% weight for form labels
    }
  }

  // Check for language attribute
  if (!page$("html").attr("lang")) {
    deductions += 10
  }

  // Check for skip links
  const skipLinks = page$('a[href^="#"]').filter((_, link) => {
    const text = page$(link).text().toLowerCase()
    return text.includes("skip") || text.includes("jump")
  }).length

  if (skipLinks === 0) {
    deductions += 5
  }

  return Math.max(0, Math.round(score - deductions))
}

function calculateSEOScore(page$: cheerio.CheerioAPI): number {
  const score = 100
  let deductions = 0

  // Check title tag
  const title = page$("title").text().trim()
  if (!title) {
    deductions += 20 // No title tag
  } else if (title.length < 30 || title.length > 60) {
    deductions += 10 // Title length not optimal
  }

  // Check meta description
  const metaDescription = page$('meta[name="description"]').attr("content")
  if (!metaDescription) {
    deductions += 15 // No meta description
  } else if (metaDescription.length < 120 || metaDescription.length > 160) {
    deductions += 8 // Meta description length not optimal
  }

  // Check H1 tag
  const h1Tags = page$("h1")
  if (h1Tags.length === 0) {
    deductions += 15 // No H1 tag
  } else if (h1Tags.length > 1) {
    deductions += 10 // Multiple H1 tags
  } else {
    const h1Text = h1Tags.first().text().trim()
    if (h1Text.length < 20 || h1Text.length > 70) {
      deductions += 5 // H1 length not optimal
    }
  }

  // Check heading hierarchy
  const h2Count = page$("h2").length
  const h3Count = page$("h3").length
  const h4Count = page$("h4").length

  if (h2Count === 0 && (h3Count > 0 || h4Count > 0)) {
    deductions += 8 // Poor heading hierarchy
  }

  // Check images with alt text
  const images = page$("img")
  const imagesWithoutAlt = images.filter((_, img) => !page$(img).attr("alt")).length
  if (images.length > 0) {
    const altTextPercentage = ((images.length - imagesWithoutAlt) / images.length) * 100
    if (altTextPercentage < 100) {
      deductions += (100 - altTextPercentage) * 0.15 // 15% weight for image optimization
    }
  }

  // Check for internal links
  const internalLinks = page$("a[href]").filter((_, link) => {
    const href = page$(link).attr("href")
    return href && !href.startsWith("http") && !href.startsWith("mailto:") && !href.startsWith("tel:")
  }).length

  if (internalLinks === 0) {
    deductions += 10 // No internal links
  }

  // Check for meta viewport
  if (!page$('meta[name="viewport"]').length) {
    deductions += 8 // No viewport meta tag
  }

  // Check for canonical URL
  if (!page$('link[rel="canonical"]').length) {
    deductions += 5 // No canonical URL
  }

  // Check for Open Graph tags
  const ogTags = page$('meta[property^="og:"]').length
  if (ogTags === 0) {
    deductions += 5 // No Open Graph tags
  }

  // Check for structured data
  const structuredData = page$('script[type="application/ld+json"]').length
  if (structuredData === 0) {
    deductions += 5 // No structured data
  }

  return Math.max(0, Math.round(score - deductions))
}
