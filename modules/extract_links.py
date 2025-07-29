import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import time

class ExtractLinks:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def get_all_links(self, url, timeout=10):
        """Extract all links from a webpage"""
        try:
            print(f"🔗 Extracting links from: {url}")
            start_time = time.time()
            
            response = self.session.get(url, timeout=timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            base_domain = urlparse(url).netloc
            
            internal_links = []
            external_links = []
            
            # Find all links
            for link in soup.find_all('a', href=True):
                href = link.get('href', '').strip()
                if not href or href.startswith('#') or href.startswith('javascript:'):
                    continue
                
                # Convert relative URLs to absolute
                absolute_url = urljoin(url, href)
                parsed_url = urlparse(absolute_url)
                
                # Skip non-http protocols
                if parsed_url.scheme not in ['http', 'https']:
                    continue
                
                link_data = {
                    'url': absolute_url,
                    'text': link.get_text(strip=True)[:100],
                    'title': link.get('title', ''),
                }
                
                # Categorize as internal or external
                if parsed_url.netloc == base_domain:
                    if absolute_url not in [l['url'] for l in internal_links]:
                        internal_links.append(link_data)
                else:
                    if absolute_url not in [l['url'] for l in external_links]:
                        external_links.append(link_data)
            
            elapsed = time.time() - start_time
            print(f"✅ Found {len(internal_links)} internal and {len(external_links)} external links in {elapsed:.2f}s")
            
            return {
                'internal_links': internal_links,
                'external_links': external_links,
                'total_links': len(internal_links) + len(external_links),
                'processing_time': elapsed
            }
            
        except Exception as e:
            print(f"❌ Error extracting links: {e}")
            return {'internal_links': [], 'external_links': [], 'total_links': 0, 'error': str(e)}
