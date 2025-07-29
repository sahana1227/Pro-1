import requests
from bs4 import BeautifulSoup
import re

class CMSDetection:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def detect_cms(self, url):
        """Detect CMS and return detailed information"""
        try:
            print(f"🔧 Detecting CMS for: {url}")
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            html_content = response.text.lower()
            
            detected_systems = {}
            
            # WordPress detection
            wp_score = 0
            wp_evidence = []
            
            if 'wp-content' in html_content:
                wp_score += 30
                wp_evidence.append('wp-content path found')
            
            if 'wp-includes' in html_content:
                wp_score += 25
                wp_evidence.append('wp-includes path found')
            
            wp_meta = soup.find('meta', {'name': 'generator', 'content': re.compile(r'wordpress', re.I)})
            if wp_meta:
                wp_score += 40
                wp_evidence.append('WordPress generator meta tag')
            
            if wp_score > 0:
                detected_systems['WordPress'] = {
                    'confidence': min(wp_score, 100),
                    'evidence': wp_evidence,
                    'detected': wp_score >= 30
                }
            
            # Shopify detection
            shopify_score = 0
            shopify_evidence = []
            
            if 'shopify' in html_content:
                shopify_score += 35
                shopify_evidence.append('Shopify references found')
            
            if 'cdn.shopify.com' in html_content:
                shopify_score += 40
                shopify_evidence.append('Shopify CDN detected')
            
            if shopify_score > 0:
                detected_systems['Shopify'] = {
                    'confidence': min(shopify_score, 100),
                    'evidence': shopify_evidence,
                    'detected': shopify_score >= 30
                }
            
            # Drupal detection
            if 'drupal' in html_content:
                detected_systems['Drupal'] = {
                    'confidence': 80,
                    'evidence': ['Drupal references found'],
                    'detected': True
                }
            
            # Joomla detection
            if 'joomla' in html_content:
                detected_systems['Joomla'] = {
                    'confidence': 80,
                    'evidence': ['Joomla references found'],
                    'detected': True
                }
            
            # Wix detection
            if 'wix.com' in html_content or 'wixstatic.com' in html_content:
                detected_systems['Wix'] = {
                    'confidence': 90,
                    'evidence': ['Wix platform detected'],
                    'detected': True
                }
            
            # Squarespace detection
            if 'squarespace' in html_content:
                detected_systems['Squarespace'] = {
                    'confidence': 85,
                    'evidence': ['Squarespace platform detected'],
                    'detected': True
                }
            
            # Get primary CMS
            primary_cms = None
            if detected_systems:
                primary_cms = max(detected_systems.keys(), 
                                key=lambda x: detected_systems[x]['confidence'])
            
            result = {
                'primary_cms': primary_cms,
                'detected_systems': detected_systems,
                'total_detected': len([cms for cms, data in detected_systems.items() if data['detected']]),
                'analysis_complete': True
            }
            
            print(f"✅ CMS Detection complete. Primary: {primary_cms}")
            return result
            
        except Exception as e:
            print(f"❌ CMS Detection failed: {e}")
            return {
                'primary_cms': None,
                'detected_systems': {},
                'total_detected': 0,
                'error': str(e),
                'analysis_complete': False
            }
