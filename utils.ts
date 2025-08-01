import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Domain URL utility functions
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return `${urlObj.protocol}//${urlObj.hostname}`
  } catch {
    return url
  }
}

export function normalizeDomain(domain: string): string {
  try {
    // Remove www. prefix for consistency
    let normalized = domain.replace(/^https?:\/\/www\./, 'https://')
    if (!normalized.startsWith('http')) {
      normalized = 'https://' + normalized
    }
    return normalized
  } catch {
    return domain
  }
}

export function getDomainName(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function groupDomainsByTLD(domains: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {}
  
  domains.forEach(domain => {
    try {
      const urlObj = new URL(domain)
      const hostname = urlObj.hostname
      const parts = hostname.split('.')
      const tld = parts.length > 1 ? parts[parts.length - 1] : 'unknown'
      
      if (!grouped[tld]) {
        grouped[tld] = []
      }
      grouped[tld].push(domain)
    } catch {
      if (!grouped['invalid']) {
        grouped['invalid'] = []
      }
      grouped['invalid'].push(domain)
    }
  })
  
  return grouped
}

export function validateDomain(domain: string): boolean {
  try {
    new URL(domain)
    return true
  } catch {
    return false
  }
}
