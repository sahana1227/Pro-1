
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
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    const forms: string[] = []
    const formDetails: Array<{link: string, action: string, method: string, fields: number}> = []
    
    $("form").each((i, form) => {
      const $form = $(form)
      
      // Generate unique form identifier
      let formId = $form.attr("id")
      if (!formId) {
        // Try to use name attribute
        formId = $form.attr("name")
      }
      if (!formId) {
        // Use action attribute if available
        const action = $form.attr("action")
        if (action) {
          formId = `form-${action.replace(/[^a-zA-Z0-9]/g, '')}-${i}`
        } else {
          formId = `form-${i}`
        }
      }
      
      // Count form fields for better identification
      const inputCount = $form.find('input').length
      const textareaCount = $form.find('textarea').length
      const selectCount = $form.find('select').length
      const totalFields = inputCount + textareaCount + selectCount
      
      const formLink = `${targetUrl}#${formId}`
      forms.push(formLink)
      
      formDetails.push({
        link: formLink,
        action: $form.attr("action") || "",
        method: $form.attr("method") || "GET",
        fields: totalFields
      })
    })
    
    return NextResponse.json({ 
      forms, 
      details: formDetails,
      total: forms.length 
    }, { status: 200 })
    
  } catch (err) {
    console.error("Form extraction error:", err)
    return NextResponse.json({ 
      error: "Form extraction failed", 
      details: err instanceof Error ? err.message : "Unknown error"
    }, { status: 500 })
  }
}
