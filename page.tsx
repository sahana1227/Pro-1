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
  Copy,
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
  const [formDomains, setFormDomains] = useState<string[]>([])
  const [formDetails, setFormDetails] = useState<any[]>([])
  const [extractionType, setExtractionType] = useState<'legacy' | 'domains' | 'detailed'>('detailed')

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
    setFormDomains([])
    setFormDetails([])
    setError("")

    try {
      console.log("🔍 Starting form validation for:", validatedUrl)
      const response = await fetch("/api/formValidation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: validatedUrl, type: extractionType }),
      })

      console.log("📡 Response status:", response.status)
      const data = await response.json()
      console.log("📊 Response data:", data)

      if (extractionType === 'domains') {
        if (data.domains && data.domains.length > 0) {
          setFormDomains(data.domains)
          console.log("✅ Form domains found:", data.domains.length)
        } else {
          setError("No form domains found on this website.")
          console.log("❌ No form domains found")
        }
      } else if (extractionType === 'detailed') {
        if (data.forms && data.forms.length > 0) {
          setFormDetails(data.forms)
          setFormDomains(data.domains || [])
          setFormLinks(data.forms.map((form: any) => `${validatedUrl}#${form.id}`))
          console.log("✅ Detailed forms found:", data.forms.length, "domains:", data.domains?.length || 0)
        } else {
          setError("No forms found on this website.")
          console.log("❌ No forms found")
        }
      } else {
        // Legacy mode
        if (data.forms && data.forms.length > 0) {
          setFormLinks(data.forms)
          console.log("✅ Forms found:", data.forms.length)
        } else {
          setError("No forms found on this website.")
          console.log("❌ No forms found")
        }
      }
    } catch (err) {
      console.error("❌ Form validation error:", err)
      setError("Form validation failed. Please check the console for details.")
    } finally {
      setLoading(false)
    }
  }

  const handleAutofill = async (link: string, index: number) => {
    try {
      console.log("🤖 Starting autofill for:", link, "index:", index)
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
      } else {
        console.log("❌ No logs received from autofill")
      }
    } catch (err) {
      console.error("❌ Autofill error:", err)
      setFormLogs(prev => [...prev, "❌ Autofill failed. Check console for details."])
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

              {/* Form Validation Card */}
              <Card
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
              </Card>
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
            {(formLinks.length > 0 || formDomains.length > 0 || formDetails.length > 0) && (
              <div className="space-y-6">
                {/* Extraction Type Selector */}
                <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Form Extraction Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {(['legacy', 'domains', 'detailed'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setExtractionType(type)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            extractionType === type
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)} Mode
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Domain URLs Display */}
                {formDomains.length > 0 && (
                  <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-2xl text-slate-800 flex items-center gap-2">
                        <Globe className="h-6 w-6" />
                        Extracted Form Domain URLs
                        <Badge variant="secondary">{formDomains.length} domains</Badge>
                      </CardTitle>
                      <CardDescription className="text-base">
                        Domain URLs extracted from form action attributes
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {formDomains.map((domain, index) => (
                          <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <div>
                                <div className="font-medium text-sm">{domain.replace(/^https?:\/\//, '')}</div>
                                <div className="text-xs text-gray-500">{domain}</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => window.open(domain, '_blank')}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                title="Open domain"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => navigator.clipboard.writeText(domain)}
                                className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                                title="Copy domain"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Detailed Form Information */}
                {formDetails.length > 0 && (
                  <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-2xl text-slate-800 flex items-center gap-2">
                        <FileText className="h-6 w-6" />
                        Detailed Form Analysis
                        <Badge variant="secondary">{formDetails.length} forms</Badge>
                      </CardTitle>
                      <CardDescription className="text-base">
                        Complete form information with fields and domains
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {formDetails.map((form, index) => (
                          <Card key={index} className="p-4 border">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-lg">Form {index + 1}: {form.id}</h4>
                                {form.name && <p className="text-sm text-gray-600">Name: {form.name}</p>}
                                <p className="text-sm text-gray-600">Method: {form.method}</p>
                                <p className="text-sm text-gray-600">Action: {form.action}</p>
                                <p className="text-sm text-blue-600 font-medium">Domain: {form.domain}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge variant="outline">{form.total_fields} fields</Badge>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleAutofill(`${url}#${form.id}`, index)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                  >
                                    Autofill
                                  </button>
                                  <button
                                    onClick={() => window.open(form.domain, '_blank')}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mb-2">
                              Fields: {form.input_count} inputs, {form.textarea_count} textareas, {form.select_count} selects
                            </div>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Legacy Form Links Display */}
                {formLinks.length > 0 && extractionType === 'legacy' && (
                  <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-2xl text-slate-800">Form Validation Results</CardTitle>
                      <CardDescription className="text-base">
                        Extracted forms and autofill activity
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
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
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Activity Log */}
                {formLogs.length > 0 && (
                  <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-xl text-slate-800">Activity Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc pl-6 text-sm text-slate-700 space-y-1">
                        {formLogs.map((log, i) => (
                          <li key={i}>{log}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

