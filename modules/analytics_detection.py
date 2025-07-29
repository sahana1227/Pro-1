import requests
from bs4 import BeautifulSoup
import re

class AnalyticsDetection:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def detect_analytics(self, url):
        """Detect analytics and marketing tools"""
        try:
            print(f"📊 Detecting analytics tools for: {url}")
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            html_content = response.text
            detected_tools = {}
            
            # Google Analytics detection
            ga_patterns = [
                r'google-analytics\.com',
                r'googletagmanager\.com',
                r'gtag\(',
                r'ga\(',
                r'UA-\d+-\d+',
                r'G-[A-Z0-9]+'
            ]
            
            ga_score = 0
            ga_evidence = []
            
            for pattern in ga_patterns:
                if re.search(pattern, html_content, re.I):
                    ga_score += 25
                    ga_evidence.append(f'Pattern found: {pattern}')
            
            if ga_score > 0:
                detected_tools['Google Analytics'] = {
                    'detected': ga_score >= 25,
                    'confidence': min(ga_score, 100),
                    'evidence': ga_evidence[:3],
                    'category': 'Analytics'
                }
            
            # Google Tag Manager
            if re.search(r'googletagmanager\.com', html_content, re.I):
                detected_tools['Google Tag Manager'] = {
                    'detected': True,
                    'confidence': 90,
                    'evidence': ['GTM script detected'],
                    'category': 'Tag Management'
                }
            
            # Facebook Pixel
            fb_patterns = [r'facebook\.net.*tr\?', r'fbq\(', r'facebook pixel']
            fb_score = sum(30 for pattern in fb_patterns if re.search(pattern, html_content, re.I))
            
            if fb_score > 0:
                detected_tools['Facebook Pixel'] = {
                    'detected': True,
                    'confidence': min(fb_score, 100),
                    'evidence': ['Facebook tracking detected'],
                    'category': 'Social Media'
                }
            
            # Hotjar
            if re.search(r'hotjar', html_content, re.I):
                detected_tools['Hotjar'] = {
                    'detected': True,
                    'confidence': 85,
                    'evidence': ['Hotjar script detected'],
                    'category': 'Heatmaps'
                }
            
            # Mixpanel
            if re.search(r'mixpanel', html_content, re.I):
                detected_tools['Mixpanel'] = {
                    'detected': True,
                    'confidence': 85,
                    'evidence': ['Mixpanel script detected'],
                    'category': 'Analytics'
                }
            
            # Categorize tools
            categories = {}
            for tool, data in detected_tools.items():
                if data['detected']:
                    category = data['category']
                    if category not in categories:
                        categories[category] = []
                    categories[category].append(tool)
            
            result = {
                'detected_tools': detected_tools,
                'categories': categories,
                'total_detected': len([t for t, d in detected_tools.items() if d['detected']]),
                'analysis_complete': True
            }
            
            print(f"✅ Analytics detection complete. Found {result['total_detected']} tools")
            return result
            
        except Exception as e:
            print(f"❌ Analytics detection failed: {e}")
            return {
                'detected_tools': {},
                'categories': {},
                'total_detected': 0,
                'error': str(e),
                'analysis_complete': False
            }
