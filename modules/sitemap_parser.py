import requests
from urllib.parse import urljoin, urlparse
import xml.etree.ElementTree as ET

class SitemapParser:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def parse_sitemap(self, url):
        """Parse sitemap.xml to find URLs"""
        try:
            print(f"🗺️ Parsing sitemap for: {url}")
            
            base_url = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
            sitemap_urls = []
            
            # Try common sitemap locations
            sitemap_locations = [
                f"{base_url}/sitemap.xml",
                f"{base_url}/sitemap_index.xml",
                f"{base_url}/sitemaps.xml"
            ]
            
            for sitemap_url in sitemap_locations:
                try:
                    urls = self._parse_single_sitemap(sitemap_url)
                    sitemap_urls.extend(urls)
                    if urls:  # If we found URLs, break
                        break
                except Exception as e:
                    print(f"⚠️ Failed to parse {sitemap_url}: {e}")
                    continue
            
            # Remove duplicates
            unique_urls = list(set(sitemap_urls))
            
            print(f"✅ Found {len(unique_urls)} URLs in sitemaps")
            
            return {
                'urls': unique_urls[:100],  # Limit to 100 URLs
                'total_found': len(unique_urls)
            }
            
        except Exception as e:
            print(f"❌ Sitemap parsing failed: {e}")
            return {
                'urls': [],
                'total_found': 0,
                'error': str(e)
            }
    
    def _parse_single_sitemap(self, sitemap_url):
        """Parse a single sitemap XML file"""
        try:
            response = self.session.get(sitemap_url, timeout=10)
            response.raise_for_status()
            
            # Try to parse as XML
            try:
                root = ET.fromstring(response.content)
                urls = []
                
                # Handle regular sitemap files
                for url_elem in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url'):
                    loc = url_elem.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                    if loc is not None:
                        urls.append(loc.text)
                
                # If no URLs found with namespace, try without
                if not urls:
                    for url_elem in root.findall('.//url'):
                        loc = url_elem.find('loc')
                        if loc is not None:
                            urls.append(loc.text)
                
                return urls
                
            except ET.ParseError:
                # If XML parsing fails, try to extract URLs with regex
                import re
                urls = re.findall(r'<loc>(.*?)</loc>', response.text)
                return urls
                
        except Exception as e:
            raise Exception(f"Failed to parse sitemap: {e}")
