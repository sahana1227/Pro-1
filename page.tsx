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
  const [detailedForms, setDetailedForms] = useState<any[]>([])
  const [formSummary, setFormSummary] = useState<any>(null)
  const [crawlMode, setCrawlMode] = useState<'single' | 'crawl'>('single')

  const validateUrl = (inputUrl: string): string | null => {
    try {
      let processedUrl = inputUrl.trim()
      
      if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
        processedUrl = 'https://' + processedUrl
      }
      
      const urlObj = new URL(processedUrl)
      
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
    setDetailedForms([])
    setFormSummary(null)

    try {
      console.log("🔍 Starting enhanced form validation for:", validatedUrl, "mode:", crawlMode)
      const requestBody = { 
        url: validatedUrl, 
        mode: crawlMode,
        max_pages: crawlMode === 'crawl' ? 20 : 1,
        max_depth: crawlMode === 'crawl' ? 2 : 1
      }
      
      const response = await fetch("/api/formValidation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      console.log("📡 Response status:", response.status)
      const data = await response.json()
      console.log("📊 Response data:", data)

      if (data.forms && data.forms.length > 0) {
        setFormLinks(data.forms)
        setDetailedForms(data.detailed_forms || [])
        setFormSummary(data.summary || null)
        console.log("✅ Forms found:", data.forms.length)
        if (crawlMode === 'crawl') {
          console.log("📄 Pages crawled:", data.pages_crawled)
        }
      } else {
        setError(`No forms found on this website${crawlMode === 'crawl' ? ' (crawled ' + (data.pages_crawled || 1) + ' pages)' : ''}.`)
        console.log("❌ No forms found")
      }
    } catch (err) {
      console.error("❌ Form validation error:", err)
      setError("Enhanced form validation failed. Please check the console for details.")
    } finally {
      setLoading(false)
    }
  }

  const handleAutofill = async (link: string, index: number) => {
    try {
      console.log("🤖 Starting enhanced autofill for:", link, "index:", index)
      const response = await fetch("/api/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link, index }),
      })

      console.log("📡 Autofill response status:", response.status)
      const data = await response.json()
      console.log("📊 Autofill response data:", data)
      
      if (data.logs) {
        setFormLogs(prev => [...prev, ...data.logs])
        console.log("✅ Autofill logs added:", data.logs.length, "entries")
      } else if (data.error) {
        setFormLogs(prev => [...prev, `❌ ${data.error}`])
      } else {
        console.log("❌ No logs received from autofill")
      }
    } catch (err) {
      console.error("❌ Autofill error:", err)
      setFormLogs(prev => [...prev, "❌ Enhanced autofill failed. Check console for details."])
    }
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  }}
                />
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

              {/* Form Validation Section */}
              <div className="space-y-4">
                <Card className="border-2 border-emerald-200 bg-white shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg text-emerald-700 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Form Validation Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="crawlMode"
                          value="single"
                          checked={crawlMode === 'single'}
                          onChange={(e) => setCrawlMode(e.target.value as 'single' | 'crawl')}
                          className="text-emerald-600"
                        />
                        <span className="text-sm font-medium">Single Page</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="crawlMode"
                          value="crawl"
                          checked={crawlMode === 'crawl'}
                          onChange={(e) => setCrawlMode(e.target.value as 'single' | 'crawl')}
                          className="text-emerald-600"
                        />
                        <span className="text-sm font-medium">Crawl Website</span>
                      </label>
                    </div>
                    <Card
                      className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] shadow-xl hover:shadow-2xl"
                      onClick={() => !loading && handleFormValidation()}
                    >
                      <CardContent className="p-6 text-center">
                        <FileText className="h-10 w-10 mx-auto mb-3" />
                        <h3 className="text-xl font-bold mb-2">
                          {crawlMode === 'single' ? 'Extract Forms' : 'Crawl & Extract Forms'}
                        </h3>
                        <p className="text-emerald-100 mb-3">
                          {crawlMode === 'single' 
                            ? 'Extract & autofill forms from current page' 
                            : 'Crawl website & find all forms (up to 20 pages)'}
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <Clock className="h-4 w-4" />
                          <Badge variant="secondary" className="bg-emerald-400/20 text-emerald-100 border-emerald-300">
                            {crawlMode === 'single' ? '~30-60 sec' : '~1-3 min'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

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
        {results && (
          <div className="space-y-8">
            {/* Results Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                        {results?.summary ? "Pages Analyzed" : "Total Links"}
                      </p>
                      <p className="text-3xl font-bold text-slate-900">
                        {results?.analyzed_links || results?.total_links || 0}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {results?.failed_links ? `${results.failed_links} failed` : "Successfully processed"}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Globe className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-50 to-white hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">
                        {results?.summary ? "Total Elements" : "Internal Links"}
                      </p>
                      <p className="text-3xl font-bold text-slate-900">
                        {results?.summary
                          ? (results.summary.total_buttons || 0) +
                            (results.summary.total_forms || 0) +
                            (results.summary.total_images || 0) +
                            (results.summary.total_headings || 0)
                          : results?.internal_links?.length || 0}
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
                        results?.summary?.average_accessibility_score || 
                        results?.elements?.accessibility?.score || 0
                      )}`}>
                        {Math.round(
                          results?.summary?.average_accessibility_score || 
                          results?.elements?.accessibility?.score || 0
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
                        {results?.summary ? "SEO Score" : "CMS Platform"}
                      </p>
                      <p className={`text-2xl font-bold ${
                        results?.summary 
                          ? getScoreColor(results.summary.average_seo_score || 0)
                          : "text-slate-900"
                      }`}>
                        {results?.summary
                          ? `${Math.round(results.summary.average_seo_score || 0)}%`
                          : results?.cms_detected?.primary_cms || "None"}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {results?.summary ? "Search optimization" : "Content management"}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <TrendingUp className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Form Results */}
            {formLinks.length > 0 && (
              <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-2xl text-slate-800 flex items-center gap-2">
                    <FileText className="h-6 w-6 text-emerald-600" />
                    Form Validation Results
                  </CardTitle>
                  <CardDescription className="text-base">
                    {crawlMode === 'crawl' 
                      ? `Found ${formLinks.length} forms across ${formSummary?.total_pages || 1} pages`
                      : `Found ${formLinks.length} forms on this page`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Summary Statistics */}
                  {formSummary && (
                    <Card className="mb-6 bg-emerald-50 border-emerald-200">
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-emerald-800 mb-3">Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-600">{formSummary.total_forms}</div>
                            <div className="text-emerald-700">Total Forms</div>
                          </div>
                          {formSummary.pages_with_forms && (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-emerald-600">{formSummary.pages_with_forms}</div>
                              <div className="text-emerald-700">Pages with Forms</div>
                            </div>
                          )}
                          <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-600">{formSummary.forms_with_required_fields || 0}</div>
                            <div className="text-emerald-700">Required Fields</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-600">{Math.round(formSummary.average_fields_per_form || 0)}</div>
                            <div className="text-emerald-700">Avg Fields/Form</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-6">
                    {detailedForms.map((form, index) => (
                      <Card key={index} className="p-6 shadow-lg border-l-4 border-l-emerald-500">
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-lg font-semibold text-slate-800">
                              Form {index + 1} {form.form_name && `(${form.form_name})`}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {form.method} {form.action && '→ Action URL'}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">
                            <strong>URL:</strong> {form.url}
                          </p>
                          {form.action && (
                            <p className="text-sm text-slate-600 mb-2">
                              <strong>Action:</strong> {form.action}
                            </p>
                          )}
                          <div className="flex gap-4 text-sm text-slate-600">
                            <span><strong>Fields:</strong> {form.field_count}</span>
                            <span><strong>Buttons:</strong> {form.buttons?.length || 0}</span>
                            {form.has_file_upload && <Badge variant="secondary" className="text-xs">File Upload</Badge>}
                            {form.has_required_fields && <Badge variant="destructive" className="text-xs">Required Fields</Badge>}
                          </div>
                        </div>

                        {/* Form Fields Preview */}
                        {form.fields && form.fields.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-semibold text-slate-700 mb-2">Form Fields:</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {form.fields.slice(0, 6).map((field: any, fieldIndex: number) => (
                                <div key={fieldIndex} className="bg-slate-50 p-2 rounded border">
                                  <span className="font-medium">{field.name || field.id || 'Unnamed'}</span>
                                  <span className="text-slate-500 ml-2">({field.type})</span>
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                  {field.placeholder && (
                                    <div className="text-slate-400 text-xs mt-1">"{field.placeholder}"</div>
                                  )}
                                </div>
                              ))}
                              {form.fields.length > 6 && (
                                <div className="bg-slate-100 p-2 rounded border text-center text-slate-500">
                                  +{form.fields.length - 6} more fields
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-3 mb-4">
                          <button
                            onClick={() => handleAutofill(formLinks[index], index)}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                          >
                            <Zap className="h-4 w-4" />
                            Smart Autofill
                          </button>
                          <button
                            onClick={() => window.open(form.url, '_blank')}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open Form
                          </button>
                        </div>

                        {/* Form Preview */}
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 border-b">
                            Form Preview
                          </div>
                          <iframe 
                            src={form.url} 
                            width="100%" 
                            height="300" 
                            className="border-0"
                            title={`Form ${index + 1} Preview`}
                          />
                        </div>
                      </Card>
                    ))}

                    {formLogs.length > 0 && (
                      <Card className="p-6 bg-slate-50 border">
                        <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                          <Eye className="h-5 w-5 text-blue-600" />
                          Autofill Activity Log
                        </h3>
                        <div className="max-h-64 overflow-y-auto">
                          <ul className="space-y-2 text-sm text-slate-700">
                            {formLogs.map((log, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-slate-400 text-xs mt-1 min-w-[20px]">{i + 1}.</span>
                                <span className={`${
                                  log.includes('✅') ? 'text-green-700' :
                                  log.includes('❌') ? 'text-red-700' :
                                  log.includes('⚠️') ? 'text-yellow-700' :
                                  log.includes('📊') ? 'text-blue-700' :
                                  'text-slate-700'
                                }`}>
                                  {log}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

