import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'modules'))

from flask import Flask, request, jsonify, render_template, send_file
from modules.autofill_bot import extract_forms_from_url, autofill_and_validate_form
from modules.enhanced_form_extractor import crawl_website_sync, extract_single_page_forms_sync
from modules.enhanced_autofill import autofill_form_sync
from flask_cors import CORS
import csv
import io
import json
from datetime import datetime

# Import only the modules that exist and work
try:
    from extract_links import ExtractLinks
    EXTRACT_LINKS_AVAILABLE = True
except ImportError:
    EXTRACT_LINKS_AVAILABLE = False
    print("⚠️ extract_links module not available")

try:
    from cms_detection import CMSDetection
    CMS_DETECTION_AVAILABLE = True
except ImportError:
    CMS_DETECTION_AVAILABLE = False
    print("⚠️ cms_detection module not available")

try:
    from analytics_detection import AnalyticsDetection
    ANALYTICS_DETECTION_AVAILABLE = True
except ImportError:
    ANALYTICS_DETECTION_AVAILABLE = False
    print("⚠️ analytics_detection module not available")

try:
    from sitemap_parser import SitemapParser
    SITEMAP_PARSER_AVAILABLE = True
except ImportError:
    SITEMAP_PARSER_AVAILABLE = False
    print("⚠️ sitemap_parser module not available")

try:
    from internal_link_logger import InternalLinkLogger
    LINK_LOGGER_AVAILABLE = True
except ImportError:
    LINK_LOGGER_AVAILABLE = False
    print("⚠️ internal_link_logger module not available")

# Basic fallback imports that should always work
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import re
import time

app = Flask(__name__)
CORS(app)

# Global storage for results
analysis_results = {}
current_audit_data = {}

class BasicAnalyzer:
    """Fallback analyzer using only basic libraries"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def extract_links(self, url):
        """Basic link extraction"""
        try:
            print(f"🔗 Extracting links from: {url}")
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            base_domain = urlparse(url).netloc
            
            internal_links = []
            external_links = []
            
            for link in soup.find_all('a', href=True):
                href = link.get('href', '').strip()
                if not href or href.startswith('#') or href.startswith('javascript:'):
                    continue
                
                absolute_url = urljoin(url, href)
                parsed_url = urlparse(absolute_url)
                
                if parsed_url.scheme not in ['http', 'https']:
                    continue
                
                link_data = {
                    'url': absolute_url,
                    'text': link.get_text(strip=True)[:100],
                    'title': link.get('title', ''),
                }
                
                if parsed_url.netloc == base_domain:
                    if absolute_url not in [l['url'] for l in internal_links]:
                        internal_links.append(link_data)
                else:
                    if absolute_url not in [l['url'] for l in external_links]:
                        external_links.append(link_data)
            
            print(f"✅ Found {len(internal_links)} internal and {len(external_links)} external links")
            return {
                'internal_links': internal_links,
                'external_links': external_links,
                'total_links': len(internal_links) + len(external_links)
            }
            
        except Exception as e:
            print(f"❌ Link extraction failed: {e}")
            return {'internal_links': [], 'external_links': [], 'total_links': 0, 'error': str(e)}
    
    def detect_cms(self, url):
        """Basic CMS detection"""
        try:
            print(f"🔧 Detecting CMS for: {url}")
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            html_content = response.text.lower()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            detected_cms = []
            
            # WordPress detection
            wp_indicators = [
                'wp-content' in html_content,
                'wp-includes' in html_content,
                soup.find('meta', {'name': 'generator', 'content': lambda x: x and 'wordpress' in x.lower()}),
                soup.find('link', {'href': lambda x: x and 'wp-content' in x})
            ]
            if any(wp_indicators):
                detected_cms.append('WordPress')
            
            # Shopify detection
            if 'shopify' in html_content or 'cdn.shopify' in html_content:
                detected_cms.append('Shopify')
            
            # Drupal detection
            if 'drupal' in html_content:
                detected_cms.append('Drupal')
            
            # Joomla detection
            if 'joomla' in html_content:
                detected_cms.append('Joomla')
            
            # Wix detection
            if 'wix.com' in html_content or 'wixstatic.com' in html_content:
                detected_cms.append('Wix')
            
            # Squarespace detection
            if 'squarespace' in html_content:
                detected_cms.append('Squarespace')
            
            result = {
                'primary_cms': detected_cms[0] if detected_cms else None,
                'detected_systems': detected_cms,
                'total_detected': len(detected_cms)
            }
            
            print(f"✅ CMS Detection complete. Found: {', '.join(detected_cms) if detected_cms else 'None'}")
            return result
            
        except Exception as e:
            print(f"❌ CMS Detection failed: {e}")
            return {'primary_cms': None, 'detected_systems': [], 'total_detected': 0, 'error': str(e)}
    
    def detect_analytics(self, url):
        """Basic analytics detection"""
        try:
            print(f"📊 Detecting analytics for: {url}")
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            html_content = response.text.lower()
            detected_tools = []
            
            # Google Analytics
            if any(pattern in html_content for pattern in ['google-analytics', 'gtag(', 'ga(']):
                detected_tools.append('Google Analytics')
            
            # Google Tag Manager
            if 'googletagmanager' in html_content:
                detected_tools.append('Google Tag Manager')
            
            # Facebook Pixel
            if 'facebook.net' in html_content or 'fbq(' in html_content:
                detected_tools.append('Facebook Pixel')
            
            # Hotjar
            if 'hotjar' in html_content:
                detected_tools.append('Hotjar')
            
            # Mixpanel
            if 'mixpanel' in html_content:
                detected_tools.append('Mixpanel')
            
            result = {
                'detected_tools': detected_tools,
                'total_detected': len(detected_tools)
            }
            
            print(f"✅ Analytics detection complete. Found: {', '.join(detected_tools) if detected_tools else 'None'}")
            return result
            
        except Exception as e:
            print(f"❌ Analytics detection failed: {e}")
            return {'detected_tools': [], 'total_detected': 0, 'error': str(e)}
    
    def analyze_elements(self, url):
        """Enhanced element analysis with detailed detection"""
        try:
            print(f"🔍 Analyzing elements for: {url}")
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Count headings with actual content
            headings = {}
            heading_content = {}
            for i in range(1, 7):
                h_elements = soup.find_all(f'h{i}')
                headings[f'h{i}'] = len(h_elements)
                heading_content[f'h{i}'] = [h.get_text(strip=True)[:50] for h in h_elements[:3]]  # First 3 headings
            
            # Analyze images with detailed info
            images = soup.find_all('img')
            images_without_alt = [img for img in images if not img.get('alt')]
            images_with_alt = [img for img in images if img.get('alt')]
            
            # Analyze forms with input details
            forms = soup.find_all('form')
            form_details = []
            for form in forms:
                inputs = form.find_all('input')
                textareas = form.find_all('textarea')
                selects = form.find_all('select')
                buttons = form.find_all(['button', 'input[type="submit"]'])
                
                form_details.append({
                    'action': form.get('action', ''),
                    'method': form.get('method', 'GET'),
                    'inputs': len(inputs),
                    'textareas': len(textareas),
                    'selects': len(selects),
                    'buttons': len(buttons)
                })
            
            # Analyze links with categories
            links = soup.find_all('a', href=True)
            internal_links = 0
            external_links = 0
            email_links = 0
            phone_links = 0
            
            base_domain = urlparse(url).netloc
            
            for link in links:
                href = link.get('href', '')
                if href.startswith('mailto:'):
                    email_links += 1
                elif href.startswith('tel:'):
                    phone_links += 1
                elif href.startswith('http'):
                    parsed = urlparse(href)
                    if parsed.netloc == base_domain:
                        internal_links += 1
                    else:
                        external_links += 1
            
            # Analyze meta tags with important ones
            meta_tags = soup.find_all('meta')
            important_meta = {}
            
            for meta in meta_tags:
                name = meta.get('name') or meta.get('property')
                content = meta.get('content')
                if name and content:
                    if name.lower() in ['description', 'keywords', 'author', 'viewport', 'robots']:
                        important_meta[name.lower()] = content[:100]
            
            # Detect interactive elements
            buttons = soup.find_all(['button', 'input[type="button"]', 'input[type="submit"]'])
            
            # Detect media elements
            videos = soup.find_all('video')
            audio = soup.find_all('audio')
            iframes = soup.find_all('iframe')
            
            # Detect social media elements
            social_links = []
            social_patterns = ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'tiktok.com']
            for link in links:
                href = link.get('href', '').lower()
                for pattern in social_patterns:
                    if pattern in href:
                        social_links.append(pattern.replace('.com', '').title())
                        break
            
            # Calculate accessibility score
            accessibility_issues = 0
            accessibility_issues += len(images_without_alt)  # Images without alt text
            accessibility_issues += len([link for link in links if not link.get_text(strip=True) and not link.get('aria-label')])  # Links without text
            
            accessibility_score = max(0, 100 - (accessibility_issues * 5))
            
            result = {
                'headings': {
                    'structure': headings,
                    'content_sample': heading_content,
                    'total_headings': sum(headings.values()),
                    'has_h1': headings.get('h1', 0) > 0,
                    'multiple_h1': headings.get('h1', 0) > 1
                },
                'images': {
                    'total_images': len(images),
                    'with_alt_text': len(images_with_alt),
                    'missing_alt_text': len(images_without_alt),
                    'alt_text_percentage': (len(images_with_alt) / len(images) * 100) if images else 0
                },
                'forms': {
                    'total_forms': len(forms),
                    'form_details': form_details,
                    'total_inputs': sum(form['inputs'] for form in form_details),
                    'total_buttons': sum(form['buttons'] for form in form_details)
                },
                'links': {
                    'total_links': len(links),
                    'internal_links': internal_links,
                    'external_links': external_links,
                    'email_links': email_links,
                    'phone_links': phone_links,
                    'social_platforms': list(set(social_links))
                },
                'meta_tags': {
                    'total_meta_tags': len(meta_tags),
                    'important_tags': important_meta,
                    'has_description': 'description' in important_meta,
                    'has_viewport': 'viewport' in important_meta
                },
                'interactive_elements': {
                    'buttons': len(buttons),
                    'forms': len(forms),
                    'total_interactive': len(buttons) + len(forms)
                },
                'media_elements': {
                    'videos': len(videos),
                    'audio': len(audio),
                    'iframes': len(iframes),
                    'total_media': len(videos) + len(audio) + len(iframes)
                },
                'accessibility': {
                    'score': accessibility_score,
                    'issues_found': accessibility_issues,
                    'images_without_alt': len(images_without_alt),
                    'links_without_text': len([link for link in links if not link.get_text(strip=True)])
                },
                'page_structure': {
                    'total_elements': len(soup.find_all()),
                    'scripts': len(soup.find_all('script')),
                    'stylesheets': len(soup.find_all('link', rel='stylesheet')),
                    'divs': len(soup.find_all('div')),
                    'paragraphs': len(soup.find_all('p'))
                }
            }
        
            print(f"✅ Enhanced element analysis complete")
            return result
        
        except Exception as e:
            print(f"❌ Element analysis failed: {e}")
            return {'error': str(e)}

# Initialize basic analyzer
basic_analyzer = BasicAnalyzer()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/analyze", methods=["POST"])
def analyze_website():
    try:
        data = request.get_json()
        url = data.get('url', '').strip()
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
            
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        print(f"\n🔍 Starting analysis for: {url}")
        
        # Initialize results
        results = {
            'url': url,
            'timestamp': datetime.now().isoformat(),
            'status': 'success'
        }
        
        # 1. Extract Links
        print("📋 Extracting links...")
        if EXTRACT_LINKS_AVAILABLE:
            try:
                link_extractor = ExtractLinks()
                link_data = link_extractor.get_all_links(url)
                results.update(link_data)
            except Exception as e:
                print(f"⚠️ ExtractLinks failed, using basic: {e}")
                link_data = basic_analyzer.extract_links(url)
                results.update(link_data)
        else:
            link_data = basic_analyzer.extract_links(url)
            results.update(link_data)
        
        # 2. CMS Detection
        print("🔧 Detecting CMS...")
        if CMS_DETECTION_AVAILABLE:
            try:
                cms_detector = CMSDetection()
                cms_data = cms_detector.detect_cms(url)
                results['cms_detected'] = cms_data
            except Exception as e:
                print(f"⚠️ CMSDetection failed, using basic: {e}")
                results['cms_detected'] = basic_analyzer.detect_cms(url)
        else:
            results['cms_detected'] = basic_analyzer.detect_cms(url)
        
        # 3. Analytics Detection
        print("📊 Detecting analytics tools...")
        if ANALYTICS_DETECTION_AVAILABLE:
            try:
                analytics_detector = AnalyticsDetection()
                analytics_data = analytics_detector.detect_analytics(url)
                results['analytics_tools'] = analytics_data
            except Exception as e:
                print(f"⚠️ AnalyticsDetection failed, using basic: {e}")
                results['analytics_tools'] = basic_analyzer.detect_analytics(url)
        else:
            results['analytics_tools'] = basic_analyzer.detect_analytics(url)
        
        # 4. Element Analysis
        print("🔍 Analyzing elements...")
        results['elements'] = basic_analyzer.analyze_elements(url)
        
        # 5. Sitemap Analysis (if available)
        if SITEMAP_PARSER_AVAILABLE:
            try:
                print("🗺️ Parsing sitemap...")
                sitemap_parser = SitemapParser()
                sitemap_data = sitemap_parser.parse_sitemap(url)
                results['sitemap_links'] = sitemap_data.get('urls', [])
            except Exception as e:
                print(f"⚠️ Sitemap parsing failed: {e}")
                results['sitemap_links'] = []
        else:
            results['sitemap_links'] = []
        
        # 6. Log Internal Links (if available)
        if LINK_LOGGER_AVAILABLE:
            try:
                print("📝 Logging internal links...")
                link_logger = InternalLinkLogger()
                link_logger.log_links(url, results.get('internal_links', []))
            except Exception as e:
                print(f"⚠️ Link logging failed: {e}")
        
        print(f"✅ Analysis complete! Found {results.get('total_links', 0)} total links")
        return jsonify(results)
        
    except Exception as e:
        print(f"❌ Error during analysis: {str(e)}")
        return jsonify({
            'error': f'Analysis failed: {str(e)}',
            'status': 'error'
        }), 500

@app.route("/api/analyze-url", methods=["POST"])
def analyze_single_url():
    """Analyze elements for a single URL"""
    try:
        data = request.get_json()
        url = data.get('url', '').strip()
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        print(f"🔍 Analyzing single URL: {url}")
        
        # Analyze elements for this specific URL
        elements_data = basic_analyzer.analyze_elements(url)
        
        result = {
            'url': url,
            'timestamp': datetime.now().isoformat(),
            'elements': elements_data,
            'status': 'success'
        }
        
        # Store in global results for CSV export
        analysis_results[url] = result
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Single URL analysis failed: {e}")
        return jsonify({
            'error': f'Analysis failed: {str(e)}',
            'status': 'error'
        }), 500

@app.route("/api/analyze-all-links", methods=["POST"])
def analyze_all_links():
    """Analyze elements for all internal links found"""
    try:
        data = request.get_json()
        base_url = data.get('url', '').strip()
        
        if not base_url:
            return jsonify({'error': 'URL is required'}), 400
            
        if not base_url.startswith(('http://', 'https://')):
            base_url = 'https://' + base_url
        
        print(f"\n🚀 Starting comprehensive analysis for all links: {base_url}")
        
        # Step 1: Extract all internal links
        print("📋 Extracting internal links...")
        if EXTRACT_LINKS_AVAILABLE:
            try:
                link_extractor = ExtractLinks()
                link_data = link_extractor.get_all_links(base_url)
                internal_links = link_data.get('internal_links', [])
            except Exception as e:
                print(f"⚠️ ExtractLinks failed, using basic: {e}")
                link_data = basic_analyzer.extract_links(base_url)
                internal_links = link_data.get('internal_links', [])
        else:
            link_data = basic_analyzer.extract_links(base_url)
            internal_links = link_data.get('internal_links', [])
        
        print(f"📊 Found {len(internal_links)} internal links to analyze")
        
        # Step 2: Analyze elements for each internal link
        analyzed_links = []
        failed_links = []
        
        # Limit to first 20 links to avoid timeout
        links_to_analyze = internal_links[:20]
        
        for i, link in enumerate(links_to_analyze, 1):
            url = link['url']
            print(f"🔍 Analyzing link {i}/{len(links_to_analyze)}: {url}")
            
            try:
                # Analyze elements for this URL
                elements_data = basic_analyzer.analyze_elements(url)
                
                # Count specific elements
                element_counts = {
                    'buttons': 0,
                    'forms': 0,
                    'images': 0,
                    'headings': 0,
                    'links': 0,
                    'videos': 0,
                    'calculators': 0,
                    'banners': 0,
                    'carousels': 0
                }
                
                if not elements_data.get('error'):
                    element_counts.update({
                        'buttons': elements_data.get('interactive_elements', {}).get('buttons', 0),
                        'forms': elements_data.get('forms', {}).get('total_forms', 0),
                        'images': elements_data.get('images', {}).get('total_images', 0),
                        'headings': elements_data.get('headings', {}).get('total_headings', 0),
                        'links': elements_data.get('links', {}).get('total_links', 0),
                        'videos': elements_data.get('media_elements', {}).get('videos', 0)
                    })
                    
                    # Detect calculators (forms with number inputs)
                    if elements_data.get('forms', {}).get('form_details'):
                        for form in elements_data['forms']['form_details']:
                            if form.get('inputs', 0) > 2:  # Likely a calculator
                                element_counts['calculators'] += 1
                    
                    # Detect banners (large images or divs with background images)
                    if elements_data.get('images', {}).get('total_images', 0) > 5:
                        element_counts['banners'] = min(3, elements_data['images']['total_images'] // 3)
                    
                    # Detect carousels (multiple images or slider indicators)
                    if elements_data.get('images', {}).get('total_images', 0) > 3:
                        element_counts['carousels'] = 1 if elements_data['images']['total_images'] > 10 else 0
                
                analyzed_link = {
                    'url': url,
                    'text': link.get('text', ''),
                    'title': link.get('title', ''),
                    'status': '✅',
                    'method': 'requests+beautifulsoup',
                    'elements': element_counts,
                    'full_analysis': elements_data,
                    'accessibility_score': elements_data.get('accessibility', {}).get('score', 0),
                    'has_forms': element_counts['forms'] > 0,
                    'has_images': element_counts['images'] > 0,
                    'seo_score': calculate_seo_score(elements_data)
                }
                
                analyzed_links.append(analyzed_link)
                
            except Exception as e:
                print(f"❌ Failed to analyze {url}: {e}")
                failed_links.append({
                    'url': url,
                    'text': link.get('text', ''),
                    'status': '❌',
                    'error': str(e),
                    'elements': {k: 0 for k in element_counts.keys()}
                })
        
        # Step 3: Generate summary statistics
        total_elements = {}
        for link in analyzed_links:
            for element_type, count in link['elements'].items():
                total_elements[element_type] = total_elements.get(element_type, 0) + count
        
        # Step 4: Prepare results
        results = {
            'base_url': base_url,
            'timestamp': datetime.now().isoformat(),
            'total_internal_links': len(internal_links),
            'analyzed_links': len(analyzed_links),
            'failed_links': len(failed_links),
            'analyzed_data': analyzed_links,
            'failed_data': failed_links,
            'summary': {
                'total_buttons': total_elements.get('buttons', 0),
                'total_forms': total_elements.get('forms', 0),
                'total_images': total_elements.get('images', 0),
                'total_headings': total_elements.get('headings', 0),
                'total_videos': total_elements.get('videos', 0),
                'total_calculators': total_elements.get('calculators', 0),
                'total_banners': total_elements.get('banners', 0),
                'total_carousels': total_elements.get('carousels', 0),
                'pages_with_forms': sum(1 for link in analyzed_links if link['has_forms']),
                'pages_with_images': sum(1 for link in analyzed_links if link['has_images']),
                'average_accessibility_score': sum(link['accessibility_score'] for link in analyzed_links) / len(analyzed_links) if analyzed_links else 0,
                'average_seo_score': sum(link['seo_score'] for link in analyzed_links) / len(analyzed_links) if analyzed_links else 0
            },
            'processing_time': f"{len(analyzed_links)} links analyzed",
            'status': 'success'
        }
        
        # Store results globally
        current_audit_data.update(results)
        
        print(f"✅ Comprehensive analysis complete!")
        print(f"📊 Analyzed: {len(analyzed_links)} links")
        print(f"❌ Failed: {len(failed_links)} links")
        print(f"🔢 Total elements found: {sum(total_elements.values())}")
        
        return jsonify(results)
        
    except Exception as e:
        print(f"❌ Comprehensive analysis failed: {str(e)}")
        return jsonify({
            'error': f'Analysis failed: {str(e)}',
            'status': 'error'
        }), 500

def calculate_seo_score(elements_data):
    """Calculate basic SEO score based on elements"""
    if elements_data.get('error'):
        return 0
    
    score = 0
    
    # H1 tags (20 points)
    if elements_data.get('headings', {}).get('has_h1'):
        score += 20
        if not elements_data.get('headings', {}).get('multiple_h1'):
            score += 10  # Bonus for single H1
    
    # Meta description (20 points)
    if elements_data.get('meta_tags', {}).get('has_description'):
        score += 20
    
    # Images with alt text (20 points)
    alt_percentage = elements_data.get('images', {}).get('alt_text_percentage', 0)
    score += int(alt_percentage * 0.2)
    
    # Viewport meta tag (10 points)
    if elements_data.get('meta_tags', {}).get('has_viewport'):
        score += 10
    
    # Reasonable number of headings (10 points)
    total_headings = elements_data.get('headings', {}).get('total_headings', 0)
    if 1 <= total_headings <= 10:
        score += 10
    
    # Forms present (10 points for interactivity)
    if elements_data.get('forms', {}).get('total_forms', 0) > 0:
        score += 10
    
    return min(score, 100)

@app.route("/api/quick-links", methods=["POST"])
def quick_links():
    """Fast endpoint for just getting links"""
    try:
        data = request.get_json()
        url = data.get('url', '').strip()
        
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        # Use fast link extraction
        link_data = basic_analyzer.extract_links(url)
        
        return jsonify({
            'internal_links': link_data.get('internal_links', []),
            'external_links': link_data.get('external_links', []),
            'total': link_data.get('total_links', 0),
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500

@app.route("/download-csv", methods=["GET"])
def download_csv():
    """Generate and download CSV report"""
    try:
        if not analysis_results:
            return jsonify({"error": "No analysis results available"}), 400
        
        # Create CSV content
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        headers = ['URL', 'Link Text', 'Title', 'Type']
        writer.writerow(headers)
        
        # Write data rows
        for url, result in analysis_results.items():
            internal_links = result.get('internal_links', [])
            external_links = result.get('external_links', [])
            
            for link in internal_links:
                writer.writerow([
                    link.get('url', ''),
                    link.get('text', ''),
                    link.get('title', ''),
                    'Internal'
                ])
            
            for link in external_links:
                writer.writerow([
                    link.get('url', ''),
                    link.get('text', ''),
                    link.get('title', ''),
                    'External'
                ])
        
        # Create response
        output.seek(0)
        csv_content = output.getvalue()
        output.close()
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"website_audit_{timestamp}.csv"
        
        # Create file-like object for download
        csv_buffer = io.BytesIO()
        csv_buffer.write(csv_content.encode('utf-8'))
        csv_buffer.seek(0)
        
        return send_file(
            csv_buffer,
            mimetype='text/csv',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        print(f"❌ CSV generation failed: {str(e)}")
        return jsonify({"error": f"CSV generation failed: {str(e)}"}), 500

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "modules_available": {
            "extract_links": EXTRACT_LINKS_AVAILABLE,
            "cms_detection": CMS_DETECTION_AVAILABLE,
            "analytics_detection": ANALYTICS_DETECTION_AVAILABLE,
            "sitemap_parser": SITEMAP_PARSER_AVAILABLE,
            "link_logger": LINK_LOGGER_AVAILABLE
        },
        "basic_analysis": True
    })
@app.route('/api/formValidation', methods=['POST'])
def form_validation():
    """Enhanced form validation endpoint with website crawling"""
    try:
        data = request.get_json()
        url = data.get('url', '').strip()
        crawl_mode = data.get('mode', 'single')  # 'single' or 'crawl'
        
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        print(f"🔍 Starting form validation for: {url} (mode: {crawl_mode})")
        
        if crawl_mode == 'crawl':
            # Full website crawl
            max_pages = data.get('max_pages', 20)
            max_depth = data.get('max_depth', 2)
            results = crawl_website_sync(url, max_pages=max_pages, max_depth=max_depth)
        else:
            # Single page extraction
            results = extract_single_page_forms_sync(url)
        
        # Convert form data to the format expected by the frontend
        form_links = []
        for form in results.get('forms', []):
            form_links.append(form.get('form_link', f"{form['url']}#form_{form['form_index']}"))
        
        print(f"✅ Found {len(form_links)} forms")
        
        return jsonify({
            'forms': form_links,
            'detailed_forms': results.get('forms', []),
            'summary': results.get('crawl_summary') or results.get('summary', {}),
            'pages_crawled': results.get('pages_crawled', 1),
            'status': 'success'
        })
        
    except Exception as e:
        print(f"❌ Form validation failed: {str(e)}")
        return jsonify({
            'error': f'Form validation failed: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/api/autofill', methods=['POST'])
def enhanced_autofill():
    """Enhanced autofill endpoint using detailed form data"""
    try:
        data = request.get_json()
        form_url = data.get('link', '')
        form_index = data.get('index', 0)
        
        # If we have detailed form data, use it directly
        if 'form_data' in data:
            form_data = data['form_data']
        else:
            # Extract form data from the URL first
            results = extract_single_page_forms_sync(form_url.split('#')[0])
            forms = results.get('forms', [])
            
            if form_index >= len(forms):
                return jsonify({
                    'error': f'Form {form_index} not found',
                    'status': 'error'
                }), 400
            
            form_data = forms[form_index]
        
        # Perform autofill
        logs = autofill_form_sync(form_data)
        
        return jsonify({
            'logs': logs,
            'status': 'success'
        })
        
    except Exception as e:
        print(f"❌ Autofill failed: {str(e)}")
        return jsonify({
            'error': f'Autofill failed: {str(e)}',
            'status': 'error'
        }), 500

# Legacy endpoints for backward compatibility
@app.route('/extract_forms', methods=['POST'])
def extract_forms():
    url = request.json.get('url')
    form_links = extract_forms_from_url(url)
    return jsonify({'forms': [{'link': link} for link in form_links]})

@app.route('/autofill', methods=['POST'])
def autofill():
    link = request.json.get('link')
    index = request.json.get('index')
    logs = autofill_and_validate_form(link, index)
    return jsonify({'logs': logs})

if __name__ == "__main__":
    print("="*80)
    print("🚀 WEBSITE AUDIT TOOL")
    print("="*80)
    print(f"🔗 Link Extraction: {'✅ Advanced' if EXTRACT_LINKS_AVAILABLE else '✅ Basic'}")
    print(f"🔧 CMS Detection: {'✅ Advanced' if CMS_DETECTION_AVAILABLE else '✅ Basic'}")
    print(f"📊 Analytics Detection: {'✅ Advanced' if ANALYTICS_DETECTION_AVAILABLE else '✅ Basic'}")
    print(f"🗺️ Sitemap Parser: {'✅' if SITEMAP_PARSER_AVAILABLE else '❌'}")
    print(f"📝 Link Logger: {'✅' if LINK_LOGGER_AVAILABLE else '❌'}")
    print("✅ Element Analysis: Available")
    print("✅ CSV Export: Available")
    print("="*80)
    print("🌐 Server starting at: http://localhost:5000")
    print("📊 Ready for website audits!")
    print("="*80)
    
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
