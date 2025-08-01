import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { link, index } = await request.json()
    
    if (!link) {
      return NextResponse.json({ error: "Form link is required" }, { status: 400 })
    }

    // Forward request to Flask backend
    const flaskResponse = await fetch("http://localhost:5000/autofill", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ link, index }),
    })

    if (!flaskResponse.ok) {
      throw new Error(`Flask backend error: ${flaskResponse.status}`)
    }

    const data = await flaskResponse.json()
    return NextResponse.json(data, { status: 200 })
    
  } catch (error) {
    console.error("Autofill API error:", error)
    return NextResponse.json(
      { error: "Failed to process autofill request", logs: ["❌ Autofill service temporarily unavailable"] }, 
      { status: 500 }
    )
  }
}