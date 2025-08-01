
import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

function extractDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return `${urlObj.protocol}//${urlObj.hostname}`
  } catch {
    return url
  }
}

function createFormSignature(form: cheerio.Cheerio, index: number): string {
  const action = form.attr("action") || ""
  const method = form.attr("method") || "GET"
  const id = form.attr("id") || `form${index}`
  const name = form.attr("name") || ""
  const className = form.attr("class") || ""
  
  // Create unique signature based on form attributes
  return `${action}|${method}|${id}|${name}|${className}`
}

export async function POST(request: NextRequest) {
  try {
    const { url, type = "legacy" } = await request.json()
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 })

    const targetUrl = url.startsWith("http") ? url : "https://" + url
    
    console.log(`🔍 Extracting forms from: ${targetUrl} (type: ${type})`)
    
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      next: { revalidate: 0 }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    
    const seenForms = new Set<string>()
    const forms: string[] = []
    const domains = new Set<string>()
    const formDetails: any[] = []

    $("form").each((i, formElement) => {
      const form = $(formElement)
      const signature = createFormSignature(form, i)
      
      // Skip duplicate forms
      if (seenForms.has(signature)) {
        console.log(`⚠️ Skipping duplicate form: ${signature}`)
        return
      }
      seenForms.add(signature)

      const action = form.attr("action") || ""
      const method = form.attr("method") || "GET"
      const formId = form.attr("id") || `form${i}`
      const formName = form.attr("name") || ""

      // Process action URL
      let actionUrl = targetUrl
      let domainUrl = extractDomainFromUrl(targetUrl)
      
      if (action && action.trim()) {
        try {
          // Handle relative URLs
          if (action.startsWith('/')) {
            actionUrl = new URL(action, targetUrl).href
          } else if (action.startsWith('http')) {
            actionUrl = action
          } else {
            actionUrl = new URL(action, targetUrl).href
          }
          domainUrl = extractDomainFromUrl(actionUrl)
        } catch (error) {
          console.log(`⚠️ Error processing action URL: ${action}`, error)
        }
      }

      // Count form fields
      const inputs = form.find('input').length
      const textareas = form.find('textarea').length
      const selects = form.find('select').length
      const totalFields = inputs + textareas + selects

      // Add to collections
      forms.push(`${targetUrl}#${formId}`)
      domains.add(domainUrl)

      // Create detailed form info
      const formDetail = {
        id: formId,
        name: formName,
        action: actionUrl,
        method: method.toUpperCase(),
        domain: domainUrl,
        input_count: inputs,
        textarea_count: textareas,
        select_count: selects,
        total_fields: totalFields,
        signature: signature
      }
      formDetails.push(formDetail)

      console.log(`✅ Processed form: ${formId} -> ${domainUrl}`)
    })

    const uniqueDomains = Array.from(domains)
    
    console.log(`📊 Results: ${forms.length} unique forms, ${uniqueDomains.length} unique domains`)

    // Return different formats based on type
    if (type === "domains") {
      return NextResponse.json({
        domains: uniqueDomains,
        total_domains: uniqueDomains.length
      }, { status: 200 })
    } else if (type === "detailed") {
      return NextResponse.json({
        forms: formDetails,
        domains: uniqueDomains,
        total_forms: formDetails.length,
        total_domains: uniqueDomains.length
      }, { status: 200 })
    } else {
      // Legacy format for backward compatibility
      return NextResponse.json({ 
        forms,
        total_forms: forms.length
      }, { status: 200 })
    }

  } catch (err) {
    console.error("❌ Form extraction error:", err)
    return NextResponse.json({ 
      error: "Form extraction failed", 
      details: err instanceof Error ? err.message : "Unknown error" 
    }, { status: 500 })
  }
}
