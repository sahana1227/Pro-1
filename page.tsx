"use client"

import { useState } from "react"
import {
  Globe,
  Zap,
  BarChart3,
  Settings,
  Download,
  FileText,
  CheckCircle,
  TrendingUp,
  Shield,
  Search,
  AlertCircle,
  Clock,
  ExternalLink,
  Eye,
  Target,
  Layers,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"

interface AnalysisResult {
  url: string
  timestamp: string
  status: string
  total_links?: number
  internal_links?: Array<{ url: string; text: string; title: string }>
  external_links?: Array<{ url: string; text: string; title: string }>
  cms_detected?: {
    primary_cms: string | null
    detected_systems: Record<string, any>
    total_detected: number
  }
  analytics_tools?: {
    detected_tools: Record<string, any>
    total_detected: number
  }
  elements?: {
    headings: any
    images: any
    forms: any
    links: any
    meta_tags: any
    accessibility: any
    performance?: any
    security?: any
  }
  analyzed_data?: Array<any>
  summary?: any
  quick_mode?: boolean
  base_url?: string
  total_internal_links?: number
  analyzed_links?: number
  failed_links?: number
  failed_data?: Array<any>
  page_insights?: {
    load_time: number
    page_size: number
    total_requests: number
    performance_score: number
  }
}

export default function WebsiteAuditTool() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingType, setLoadingType] = useState("")
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [progress, setProgress] = useState(0)
  const [formLinks, setFormLinks] = useState<string[]>([])
  const [formLogs, setFormLogs] = useState<string[]>([])

  const validateUrl = (inputUrl: string): string | null => {
    try {
      let processedUrl = inputUrl.trim()
      
      // Add protocol if missing
      if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
        processedUrl = 'https://' + processedUrl
      }
      
      // Validate URL format
      const urlObj = new URL(processedUrl)
      
      // Check for valid domain
      if (!urlObj.hostname || urlObj.hostname.length < 3) {
        return null
      }
      
      return processedUrl
    } catch {
      return null
    }
  }

  const handleAnalysis = async (type: "quick" | "full" | "deep") => {
    const validatedUrl = validateUrl(url)
    
    if (!validatedUrl) {
      setError("Please enter a valid URL (e.g., example.com or https://example.com)")
      return
    }

    setLoading(true)
    setLoadingType(type)
    setError("")
    setResults(null)
    setProgress(0)

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 15
      })
    }, 1000)

    try {
      let endpoint = ""
      let expectedTime = ""

      switch (type) {
        case "quick":
          endpoint = "/api/quick-links"
          expectedTime = "~30 seconds"
          break
        case "full":
          endpoint = "/api/analyze"
          expectedTime = "~2-3 minutes"
          break
        case "deep":
          endpoint = "/api/analyze-all-links"
          expectedTime = "~3-5 minutes"
          break
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: validatedUrl }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setProgress(100)
        setResults(data)
        setActiveTab("overview")
      }
    } catch (err) {
      setError(`Analysis failed: ${err instanceof Error ? err.message : "Network error occurred"}`)
    } finally {
      clearInterval(progressInterval)
      setLoading(false)
      setLoadingType("")
      setProgress(0)
    }
  }
    const handleFormValidation = async () => {
    const validatedUrl = validateUrl(url)

    if (!validatedUrl) {
    setError("Please enter a valid URL for form validation")
    return
  }

    setLoading(true)
    setFormLinks([])
    setFormLogs([])

  try {
    const response = await fetch("/api/formValidation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: validatedUrl }),
    })

    const data = await response.json()
    if (data.forms) {
      setFormLinks(data.forms)
    } else {
      setError("No forms found or extraction failed.")
    }
  } catch (err) {
    setError("Form validation failed.")
  } finally {
    setLoading(false)
  }
}
     const handleAutofill = async (link: string, index: number) => {
     const response = await fetch("/api/autofill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ link, index }),
  })

  const data = await response.json()
  if (data.logs) {
    setFormLogs(prev => [...prev, ...data.logs])
  }
}

  const exportResults = (format: "json" | "csv" | "report") => {
    if (!results) return

    let content = ""
    let filename = ""
    let mimeType = ""

    const timestamp = new Date().toISOString().split("T")[0]
    const domain = results.url ? new URL(results.url).hostname : "website"

    switch (format) {
      case "json":
        content = JSON.stringify(results, null, 2)
        filename = `${domain}-audit-${timestamp}.json`
        mimeType = "application/json"
        break
      case "csv":
        content = generateCSV(results)
        filename = `${domain}-links-${timestamp}.csv`
        mimeType = "text/csv"
        break
      case "report":
        content = generateReport(results)
        filename = `${domain}-audit-report-${timestamp}.txt`
        mimeType = "text/plain"
        break
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const generateCSV = (data: AnalysisResult) => {
    let csv = "Type,URL,Text,Title,Status,Buttons,Forms,Images,Headings,Videos,Accessibility Score,SEO Score,Performance Score\n"

    // For deep analysis, include analyzed data
    if (data.analyzed_data) {
      data.analyzed_data.forEach((link) => {
        csv += `"Analyzed","${link.url}","${(link.text || "").replace(/"/g, '""')}","${(link.title || "").replace(/"/g, '""')}","${link.status}",${link.elements?.buttons || 0},${link.elements?.forms || 0},${link.elements?.images || 0},${link.elements?.headings || 0},${link.elements?.videos || 0},${link.accessibility_score || 0},${link.seo_score || 0},${link.performance_score || 0}\n`
      })
    }

    // For regular analysis, include internal/external links
    data.internal_links?.forEach((link) => {
      csv += `"Internal","${link.url}","${(link.text || "").replace(/"/g, '""')}","${(link.title || "").replace(/"/g, '""')}","N/A",0,0,0,0,0,0,0,0\n`
    })

    data.external_links?.forEach((link) => {
      csv += `"External","${link.url}","${(link.text || "").replace(/"/g, '""')}","${(link.title || "").replace(/"/g, '""')}","N/A",0,0,0,0,0,0,0,0\n`
    })

    return csv
  }

  const generateReport = (data: AnalysisResult) => {
    const domain = data.url ? new URL(data.url).hostname : "Unknown"
    let report = `WEBSITE AUDIT REPORT\n`
    report += `${"=".repeat(50)}\n`
    report += `Domain: ${domain}\n`
    report += `URL: ${data.url || data.base_url}\n`
    report += `Generated: ${new Date().toLocaleString()}\n`
    report += `Analysis Type: ${data.summary ? "Deep Analysis" : "Standard Analysis"}\n`
    report += `${"=".repeat(50)}\n\n`

    // Executive Summary
    report += `EXECUTIVE SUMMARY\n`
    report += `${"-".repeat(20)}\n`
    if (data.summary) {
      report += `• ${data.analyzed_links || 0} pages successfully analyzed\n`
      report += `• ${data.summary.total_buttons + data.summary.total_forms + data.summary.total_images + data.summary.total_headings} total elements found\n`
      report += `• ${data.summary.average_accessibility_score?.toFixed(1) || 0}% average accessibility score\n`
      report += `• ${data.summary.average_seo_score?.toFixed(1) || 0}% average SEO score\n`
    } else {
      report += `• ${data.total_links || 0} total links found\n`
      report += `• ${data.internal_links?.length || 0} internal links\n`
      report += `• ${data.external_links?.length || 0} external links\n`
      if (data.elements?.accessibility?.score) {
        report += `• ${data.elements.accessibility.score}% accessibility score\n`
      }
    }
    report += `\n`

    // Technology Stack
    if (data.cms_detected) {
      report += `TECHNOLOGY STACK\n`
      report += `${"-".repeat(20)}\n`
      report += `Primary CMS: ${data.cms_detected.primary_cms || "Not detected"}\n`
      if (data.cms_detected.detected_systems && Object.keys(data.cms_detected.detected_systems).length > 0) {
        report += `Detected Systems:\n`
        Object.entries(data.cms_detected.detected_systems).forEach(([cms, details]: [string, any]) => {
          if (details.detected) {
            report += `  • ${cms} (${details.confidence}% confidence)\n`
          }
        })
      }
      report += `\n`
    }

    // Analytics & Marketing
    if (data.analytics_tools && data.analytics_tools.total_detected > 0) {
      report += `ANALYTICS & MARKETING TOOLS\n`
      report += `${"-".repeat(30)}\n`
      Object.entries(data.analytics_tools.detected_tools).forEach(([tool, details]: [string, any]) => {
        if (details.detected) {
          report += `• ${tool} (${details.category || "Unknown"})\n`
        }
      })
      report += `\n`
    }

    // Detailed Analysis
    if (data.summary) {
      report += `DETAILED ELEMENT ANALYSIS\n`
      report += `${"-".repeat(30)}\n`
      report += `Buttons: ${data.summary.total_buttons}\n`
      report += `Forms: ${data.summary.total_forms}\n`
      report += `Images: ${data.summary.total_images}\n`
      report += `Headings: ${data.summary.total_headings}\n`
      report += `Videos: ${data.summary.total_videos}\n`
      report += `Calculators: ${data.summary.total_calculators}\n`
      report += `Banners: ${data.summary.total_banners}\n`
      report += `Carousels: ${data.summary.total_carousels}\n`
      report += `\n`
      
      report += `QUALITY METRICS\n`
      report += `${"-".repeat(20)}\n`
      report += `Pages with Forms: ${data.summary.pages_with_forms}\n`
      report += `Pages with Images: ${data.summary.pages_with_images}\n`
      report += `Average Accessibility Score: ${data.summary.average_accessibility_score?.toFixed(1)}%\n`
      report += `Average SEO Score: ${data.summary.average_seo_score?.toFixed(1)}%\n`
      report += `\n`
    }

    // Recommendations
    report += `RECOMMENDATIONS\n`
    report += `${"-".repeat(20)}\n`
    if (data.elements?.accessibility?.score && data.elements.accessibility.score < 80) {
      report += `• Improve accessibility score (currently ${data.elements.accessibility.score}%)\n`
    }
    if (data.elements?.images?.alt_text_percentage && data.elements.images.alt_text_percentage < 100) {
      report += `• Add alt text to ${data.elements.images.missing_alt_text} images\n`
    }
    if (!data.cms_detected?.primary_cms) {
      report += `• Consider implementing a content management system\n`
    }
    if (data.analytics_tools?.total_detected === 0) {
      report += `• Implement analytics tracking (Google Analytics recommended)\n`
    }
    
    report += `\nReport generated by Xerago Website Audit Tool\n`
    return report
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default"
    if (score >= 60) return "secondary"
    return "destructive"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-blue-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <div className="flex justify-center items-center mb-4">
              <Image 
                src="/logo.png" 
                alt="Xerago Logo" 
                width={200} 
                height={60} 
                className="mr-4 drop-shadow-sm" 
                priority
              />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
              Website Audit Tool
            </h1>
            <p className="text-xl text-slate-600 mb-6">
              Professional website analysis, SEO insights & performance optimization
            </p>
            <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>SEO Analysis</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <span>Accessibility Check</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span>Performance Insights</span>
              </div>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-orange-500" />
                <span>CMS Detection</span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-red-500" />
                <span>Element Analysis</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

    {/* Main Content */}
      <><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* URL Input Section */}
    <Card className="mb-8 shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="pb-6">
        <CardTitle className="text-2xl text-slate-800 flex items-center gap-3">
          <Globe className="h-6 w-6 text-blue-600" />
          Enter Website URL
        </CardTitle>
        <CardDescription className="text-base">
          Analyze any website for comprehensive insights, SEO optimization, and performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-6">
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <Input
              type="url"
              placeholder="example.com or https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-12 h-14 text-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 bg-white rounded-xl shadow-sm"
              disabled={loading}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleAnalysis('full')
                }
              } } />
          </div>

          {/* Analysis Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card
              className="border-2 border-blue-200 bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] shadow-xl hover:shadow-2xl"
              onClick={() => !loading && handleAnalysis("quick")}
            >
              <CardContent className="p-6 text-center">
                <Zap className="h-10 w-10 mx-auto mb-3" />
                <h3 className="text-xl font-bold mb-2">Quick Links</h3>
                <p className="text-blue-100 mb-3">Fast link extraction & basic analysis</p>
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  <Badge variant="secondary" className="bg-blue-400/20 text-blue-100 border-blue-300">
                    ~30 seconds
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card
              className="border-2 border-purple-200 bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] shadow-xl hover:shadow-2xl"
              onClick={() => !loading && handleAnalysis("full")}
            >
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-10 w-10 mx-auto mb-3" />
                <h3 className="text-xl font-bold mb-2">Full Analysis</h3>
                <p className="text-purple-100 mb-3">Complete audit with SEO & accessibility</p>
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  <Badge variant="secondary" className="bg-purple-400/20 text-purple-100 border-purple-300">
                    ~2-3 minutes
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card
              className="border-2 border-green-200 bg-gradient-to-br from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] shadow-xl hover:shadow-2xl"
              onClick={() => !loading && handleAnalysis("deep")}
            >
              <CardContent className="p-6 text-center">
                <Layers className="h-10 w-10 mx-auto mb-3" />
                <h3 className="text-xl font-bold mb-2">Deep Analysis</h3>
                <p className="text-green-100 mb-3">Multi-page element & performance analysis</p>
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  <Badge variant="secondary" className="bg-green-400/20 text-green-100 border-green-300">
                    ~3-5 minutes
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  </div><Card
    className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] shadow-xl hover:shadow-2xl"
    onClick={() => !loading && handleFormValidation()}
  >
      <CardContent className="p-6 text-center">
        <FileText className="h-10 w-10 mx-auto mb-3" />
        <h3 className="text-xl font-bold mb-2">Form Validation</h3>
        <p className="text-emerald-100 mb-3">Extract & autofill all forms</p>
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-4 w-4" />
          <Badge variant="secondary" className="bg-emerald-400/20 text-emerald-100 border-emerald-300">
            ~30-60 sec
          </Badge>
        </div>
      </CardContent>
    </Card></>


        {/* Loading State */}
        {loading && (
          <Card className="mb-8 shadow-2xl bg-white/95 backdrop-blur-sm border-0">
            <CardContent className="p-8 text-center">
              <div className="relative mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto"></div>
                <div className="absolute inset-0 rounded-full border-4 border-blue-100 h-16 w-16 mx-auto"></div>
              </div>
              <h3 className="text-2xl font-semibold text-slate-800 mb-3">
                {loadingType === "quick" && "Running Quick Analysis..."}
                {loadingType === "full" && "Running Full Analysis..."}
                {loadingType === "deep" && "Running Deep Analysis..."}
              </h3>
              <p className="text-slate-600 mb-4">
                {loadingType === "deep"
                  ? "Analyzing multiple pages and counting elements across your website..."
                  : loadingType === "full"
                  ? "Performing comprehensive SEO, accessibility, and technical analysis..."
                  : "Extracting links and performing basic analysis..."}
              </p>
              <div className="max-w-md mx-auto">
                <div className="flex justify-between text-sm text-slate-500 mb-2">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3 bg-slate-200" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Alert className="mb-8 border-red-200 bg-red-50/80 backdrop-blur-sm shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              <strong>Analysis Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {results && (<div className="space-y-8">
            {/* Results Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                        {results.summary ? "Pages Analyzed" : "Total Links"}
                      </p>
                      <p className="text-3xl font-bold text-slate-900">
                        {results.analyzed_links || results.total_links || 0}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {results.failed_links ? `${results.failed_links} failed` : "Successfully processed"}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Globe className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
              <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-50 to-white hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">
                        {results.summary ? "Total Elements" : "Internal Links"}
                      </p>
                      <p className="text-3xl font-bold text-slate-900">
                        {results.summary
                          ? (results.summary.total_buttons || 0) +
                            (results.summary.total_forms || 0) +
                            (results.summary.total_images || 0) +
                            (results.summary.total_headings || 0)
                          : results.internal_links?.length || 0}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        Interactive components
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <Zap className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-0 bg-gradient-to-br from-green-50 to-white hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
                        Accessibility Score
                      </p>
                      <p className={`text-3xl font-bold ${getScoreColor(
                        results.summary?.average_accessibility_score || 
                        results.elements?.accessibility?.score || 0
                      )}`}>
                        {Math.round(
                          results.summary?.average_accessibility_score || 
                          results.elements?.accessibility?.score || 0
                        )}%
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        WCAG compliance
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-xl">
                      <Shield className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-0 bg-gradient-to-br from-orange-50 to-white hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">
                        {results.summary ? "SEO Score" : "CMS Platform"}
                      </p>
                      <p className={`text-2xl font-bold ${
                        results.summary 
                          ? getScoreColor(results.summary.average_seo_score || 0)
                          : "text-slate-900"
                      }`}>
                        {results.summary
                          ? `${Math.round(results.summary.average_seo_score || 0)}%`
                          : results.cms_detected?.primary_cms || "None"}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {results.summary ? "Search optimization" : "Content management"}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <TrendingUp className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
        )
           { /* Deep Analysis Summary */}
            {results.summary && (
              <Card className="shadow-2xl border-0 bg-gradient-to-br from-white to-slate-50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl text-slate-800 flex items-center gap-3">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                    Deep Analysis Summary
                  </CardTitle>
                  <CardDescription className="text-base">
                    Comprehensive element distribution across all analyzed pages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    {[
                      { key: 'total_buttons', label: 'Buttons', color: 'blue', icon: '🔘' },
                      { key: 'total_forms', label: 'Forms', color: 'green', icon: '📝' },
                      { key: 'total_images', label: 'Images', color: 'purple', icon: '🖼️' },
                      { key: 'total_headings', label: 'Headings', color: 'orange', icon: '📰' },
                      { key: 'total_videos', label: 'Videos', color: 'red', icon: '🎥' },
                      { key: 'total_calculators', label: 'Calculators', color: 'indigo', icon: '🧮' },
                      { key: 'total_banners', label: 'Banners', color: 'pink', icon: '🎯' },
                      { key: 'total_carousels', label: 'Carousels', color: 'teal', icon: '🎠' },
                    ].map(({ key, label, color, icon }) => (
                      <div key={key} className={`text-center p-4 bg-gradient-to-br from-${color}-50 to-${color}-100 rounded-xl border border-${color}-200 hover:shadow-lg transition-shadow`}>
                        <div className="text-2xl mb-2">{icon}</div>
                        <p className={`text-2xl font-bold text-${color}-700`}>
                          {results.summary?.[key] || 0}
                        </p>
                        <p className={`text-xs text-${color}-600 font-medium`}>{label}</p>
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200">
                      <p className="text-lg font-semibold text-emerald-700 mb-1">Pages with Forms</p>
                      <p className="text-2xl font-bold text-emerald-800">{results.summary.pages_with_forms}</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-sky-50 to-sky-100 rounded-xl border border-sky-200">
                      <p className="text-lg font-semibold text-sky-700 mb-1">Pages with Images</p>
                      <p className="text-2xl font-bold text-sky-800">{results.summary.pages_with_images}</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl border border-violet-200">
                      <p className="text-lg font-semibold text-violet-700 mb-1">Avg Accessibility</p>
                      <p className={`text-2xl font-bold ${getScoreColor(results.summary.average_accessibility_score || 0)}`}>
                        {(results.summary.average_accessibility_score || 0).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
                      <p className="text-lg font-semibold text-amber-700 mb-1">Avg SEO Score</p>
                      <p className={`text-2xl font-bold ${getScoreColor(results.summary.average_seo_score || 0)}`}>
                        {(results.summary.average_seo_score || 0).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
               <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-slate-800">Detailed Analysis Results</CardTitle>
                <CardDescription className="text-base">
                  Comprehensive breakdown of your website analysis with actionable insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 bg-slate-100 p-1 rounded-xl">
                    <TabsTrigger
                      value="overview"
                      className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="links"
                      className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {results.analyzed_data ? "Pages" : "Links"}
                    </TabsTrigger>
                    <TabsTrigger
                      value="cms"
                      className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Technology
                    </TabsTrigger>
                    <TabsTrigger
                      value="elements"
                      className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                    >
                      <Layers className="h-4 w-4 mr-2" />
                      Elements
                    </TabsTrigger>
                    <TabsTrigger
                      value="seo"
                      className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      SEO
                    </TabsTrigger>
                    <TabsTrigger
                      value="export"
                      className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card><TabsContent value="overview" className="mt-8">
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {results.cms_detected && (
                      <Card className="border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3 text-xl">
                            <Settings className="h-6 w-6 text-blue-600" />
                            Technology Stack
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                              <span className="font-medium text-slate-700">Primary CMS:</span>
                              <Badge
                                variant={results.cms_detected.primary_cms ? "default" : "secondary"}
                                className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1"
                              >
                                {results.cms_detected.primary_cms || "Not detected"}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                              <span className="font-medium text-slate-700">Systems Found:</span>
                              <span className="text-xl font-bold text-blue-600">
                                {results.cms_detected.total_detected}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {results.analytics_tools && (
                      <Card className="border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3 text-xl">
                            <BarChart3 className="h-6 w-6 text-purple-600" />
                            Analytics & Marketing
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                              <span className="font-medium text-slate-700">Tools Detected:</span>
                              <span className="text-xl font-bold text-purple-600">
                                {results.analytics_tools.total_detected}
                              </span>
                            </div>
                            {results.analytics_tools.total_detected > 0 && (
                              <div className="space-y-2">
                                {Object.entries(results.analytics_tools.detected_tools).map(
                                  ([tool, details]: [string, any]) => details.detected && (
                                    <div key={tool} className="flex items-center justify-between p-2 bg-white rounded border">
                                      <span className="text-sm font-medium">{tool}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {details.category}
                                      </Badge>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {results.elements && (
                    <Card className="border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-xl">Page Elements Overview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                            <p className="text-2xl font-bold text-blue-600 mb-1">
                              {results.elements.headings?.total_headings || 0}
                            </p>
                            <p className="text-sm font-medium text-blue-700">Headings</p>
                            {results.elements.headings?.has_h1 && (
                              <Badge variant="outline" className="mt-2 text-xs border-blue-300 text-blue-600">
                                H1 Present
                              </Badge>
                            )}
                          </div>
                          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                            <p className="text-2xl font-bold text-purple-600 mb-1">
                              {results.elements.images?.total_images || 0}
                            </p>
                            <p className="text-sm font-medium text-purple-700">Images</p>
                            <Badge
                              variant={(results.elements.images?.alt_text_percentage || 0) >= 90
                                ? "default"
                                : "destructive"}
                              className="mt-2 text-xs"
                            >
                              {(results.elements.images?.alt_text_percentage || 0).toFixed(0)}% Alt Text
                            </Badge>
                          </div>
                          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                            <p className="text-2xl font-bold text-green-600 mb-1">
                              {results.elements.forms?.total_forms || 0}
                            </p>
                            <p className="text-sm font-medium text-green-700">Forms</p>
                            {(results.elements.forms?.total_forms || 0) > 0 && (
                              <Badge variant="outline" className="mt-2 text-xs border-green-300 text-green-600">
                                Interactive
                              </Badge>
                            )}
                          </div>
                          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                            <p className={`text-2xl font-bold mb-1 ${getScoreColor(results.elements.accessibility?.score || 0)}`}>
                              {results.elements.accessibility?.score || 0}%
                            </p>
                            <p className="text-sm font-medium text-orange-700">Accessibility</p>
                            <Badge
                              variant={getScoreBadgeVariant(results.elements.accessibility?.score || 0)}
                              className="mt-2 text-xs"
                            >
                              {(results.elements.accessibility?.score || 0) >= 80 ? "Good" :
                                (results.elements.accessibility?.score || 0) >= 60 ? "Fair" : "Poor"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent><TabsContent value="links" className="mt-8">
                <div className="space-y-6">
                  {results.analyzed_data ? (
                    // Deep analysis results
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold">Page-by-Page Analysis</h3>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="border-green-200 text-green-700">
                            ✅ {results.analyzed_data.length} analyzed
                          </Badge>
                          {(results.failed_links || 0) > 0 && (
                            <Badge variant="outline" className="border-red-200 text-red-700">
                              ❌ {results.failed_links} failed
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
                        {results.analyzed_data.map((page: any, index: number) => (
                          <Card
                            key={index}
                            className="p-6 border border-slate-200 bg-gradient-to-r from-white to-slate-50 hover:shadow-lg transition-shadow"
                          >
                            <div className="space-y-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <a
                                    href={page.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 font-medium break-all text-sm hover:underline flex items-center gap-2"
                                  >
                                    {page.url}
                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                  </a>
                                  {page.text && (
                                    <p className="text-xs text-slate-600 bg-slate-100 p-2 rounded mt-2 line-clamp-2">
                                      {page.text}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge
                                    variant={page.status === "✅" ? "default" : "destructive"}
                                    className="text-xs"
                                  >
                                    {page.status}
                                  </Badge>
                                  {page.accessibility_score && (
                                    <Badge
                                      variant={getScoreBadgeVariant(page.accessibility_score)}
                                      className="text-xs"
                                    >
                                      A11y: {page.accessibility_score}%
                                    </Badge>
                                  )}
                                  {page.seo_score && (
                                    <Badge
                                      variant={getScoreBadgeVariant(page.seo_score)}
                                      className="text-xs"
                                    >
                                      SEO: {page.seo_score}%
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-4 md:grid-cols-8 gap-3 text-xs">
                                {[
                                  { key: 'buttons', label: 'Buttons', color: 'blue' },
                                  { key: 'forms', label: 'Forms', color: 'green' },
                                  { key: 'images', label: 'Images', color: 'purple' },
                                  { key: 'headings', label: 'Headings', color: 'orange' },
                                  { key: 'videos', label: 'Videos', color: 'red' },
                                  { key: 'calculators', label: 'Calc', color: 'indigo' },
                                  { key: 'banners', label: 'Banners', color: 'pink' },
                                  { key: 'carousels', label: 'Carousel', color: 'teal' },
                                ].map(({ key, label, color }) => (
                                  <div key={key} className={`text-center p-3 bg-${color}-50 rounded-lg border border-${color}-100`}>
                                    <p className={`font-bold text-${color}-600`}>{page.elements?.[key] || 0}</p>
                                    <p className={`text-${color}-700 font-medium`}>{label}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Regular link analysis
                    <Tabs defaultValue="internal">
                      <TabsList className="bg-slate-100">
                        <TabsTrigger
                          value="internal"
                          className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
                        >
                          Internal Links ({results.internal_links?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger
                          value="external"
                          className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
                        >
                          External Links ({results.external_links?.length || 0})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="internal" className="mt-6">
                        <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                          {results.internal_links?.map((link, index) => (
                            <Card
                              key={index}
                              className="p-4 border border-blue-100 bg-gradient-to-r from-blue-50/50 to-white hover:shadow-md transition-shadow"
                            >
                              <div>
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 font-medium break-all hover:underline flex items-center gap-2"
                                >
                                  {link.url}
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                </a>
                                {link.text && (
                                  <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded line-clamp-2">
                                    {link.text}
                                  </p>
                                )}
                                {link.title && (
                                  <p className="text-xs text-slate-500 mt-1 italic">
                                    Title: {link.title}
                                  </p>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="external" className="mt-6">
                        <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                          {results.external_links?.map((link, index) => (
                            <Card
                              key={index}
                              className="p-4 border border-purple-100 bg-gradient-to-r from-purple-50/50 to-white hover:shadow-md transition-shadow"
                            >
                              <div>
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-600 hover:text-purple-800 font-medium break-all hover:underline flex items-center gap-2"
                                >
                                  {link.url}
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                </a>
                                {link.text && (
                                  <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded line-clamp-2">
                                    {link.text}
                                  </p>
                                )}
                                {link.title && (
                                  <p className="text-xs text-slate-500 mt-1 italic">
                                    Title: {link.title}
                                  </p>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                </div>
              </TabsContent><TabsContent value="cms" className="mt-8">
                <div className="space-y-8">
                  {results.cms_detected && (
                    <Card className="border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-3">
                          <Settings className="h-6 w-6 text-blue-600" />
                          Content Management System Detection
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <h4 className="font-semibold mb-3 text-blue-800">Primary CMS Platform</h4>
                            <Badge
                              variant={results.cms_detected.primary_cms ? "default" : "secondary"}
                              className="text-lg px-4 py-2 bg-blue-100 text-blue-800 border-blue-200"
                            >
                              {results.cms_detected.primary_cms || "Not detected"}
                            </Badge>
                          </div>

                          {results.cms_detected.detected_systems &&
                            Object.keys(results.cms_detected.detected_systems).length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-4 text-slate-800">All Detected Systems</h4>
                                <div className="grid gap-4">
                                  {Object.entries(results.cms_detected.detected_systems).map(
                                    ([cms, details]: [string, any]) => (
                                      <div
                                        key={cms}
                                        className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
                                      >
                                        <div>
                                          <span className="font-medium text-lg">{cms}</span>
                                          {details.evidence && details.evidence.length > 0 && (
                                            <p className="text-sm text-slate-600 mt-1">
                                              Evidence: {details.evidence.slice(0, 2).join(', ')}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <Badge
                                            variant={details.detected ? "default" : "secondary"}
                                            className="bg-green-100 text-green-800"
                                          >
                                            {details.detected ? "✅ Confirmed" : "❓ Possible"}
                                          </Badge>
                                          <Badge variant="outline" className="border-blue-200 text-blue-700">
                                            {details.confidence}% confidence
                                          </Badge>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {results.analytics_tools && (
                    <Card className="border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-3">
                          <BarChart3 className="h-6 w-6 text-purple-600" />
                          Analytics & Marketing Tools
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {results.analytics_tools.detected_tools &&
                            Object.keys(results.analytics_tools.detected_tools).length > 0 ? (
                            <div className="grid gap-4">
                              {Object.entries(results.analytics_tools.detected_tools).map(
                                ([tool, details]: [string, any]) => details.detected && (
                                  <div
                                    key={tool}
                                    className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-white rounded-xl border border-purple-200 hover:shadow-md transition-shadow"
                                  >
                                    <div>
                                      <span className="font-medium text-lg">{tool}</span>
                                      <p className="text-sm text-slate-600 mt-1">
                                        Category: {details.category || "Analytics"}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Badge variant="default" className="bg-green-100 text-green-800">
                                        ✅ Active
                                      </Badge>
                                      <Badge variant="outline" className="border-purple-200 text-purple-700">
                                        {details.confidence}% confidence
                                      </Badge>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-200">
                              <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                              <p className="text-slate-600 text-lg">No analytics tools detected</p>
                              <p className="text-slate-500 text-sm mt-2">
                                Consider implementing Google Analytics or similar tools for better insights
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent><TabsContent value="elements" className="mt-8">
                {results.elements && !results.elements.error ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Card className="border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-lg">
                        <CardHeader>
                          <CardTitle className="text-xl flex items-center gap-3">
                            <FileText className="h-6 w-6 text-blue-600" />
                            Heading Structure Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {results.elements.headings?.structure &&
                              Object.entries(results.elements.headings.structure).map(
                                ([tag, count]: [string, any]) => count > 0 && (
                                  <div key={tag} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span className="font-medium text-slate-700">{tag.toUpperCase()} Tags</span>
                                    <Badge variant="outline" className="border-blue-200 text-blue-700 text-base px-3 py-1">
                                      {count}
                                    </Badge>
                                  </div>
                                )
                              )}

                            {results.elements.headings?.content_sample && (
                              <div className="mt-6">
                                <h5 className="font-medium text-slate-700 mb-3">Sample Headings:</h5>
                                <div className="space-y-2">
                                  {Object.entries(results.elements.headings.content_sample).map(
                                    ([tag, headings]: [string, any]) => headings.length > 0 && (
                                      <div key={tag} className="text-sm">
                                        <span className="font-medium text-slate-600">{tag.toUpperCase()}:</span>
                                        <ul className="ml-4 mt-1 space-y-1">
                                          {headings.slice(0, 3).map((heading: string, idx: number) => (
                                            <li key={idx} className="text-slate-600 truncate">
                                              • {heading}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>)
                  :
                }
              </TabsContent><TabsContent value="results" className mt8>
                {formLinks.length > 0 && (
                  <div className="mt-12 space-y-6">
                    <h2 className="text-2xl font-bold text-slate-800">Extracted Forms</h2>

                    {formLinks.map((link, index) => (
                      <Card key={index} className="p-4 shadow-md">
                        <p className="text-sm text-slate-600 mb-2">Form {index + 1}: {link}</p>
                        <button
                          onClick={() => handleAutofill(link, index)}
                          className="bg-blue-600 text-white px-4 py-2 rounded mb-3 hover:bg-blue-700"
                        >
                          Autofill
                        </button>
                        <iframe src={link} width="100%" height="300" className="border" />
                      </Card>
                    ))}

                    {formLogs.length > 0 && (
                      <Card className="p-6 bg-gray-50 border">
                        <h3 className="text-lg font-semibold text-slate-800 mb-3">Activity Log</h3>
                        <ul className="list-disc pl-6 text-sm text-slate-700 space-y-1">
                          {formLogs.map((log, i) => (
                            <li key={i}>{log}</li>
                          ))}
                        </ul>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>

