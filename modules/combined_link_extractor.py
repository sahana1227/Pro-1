import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import concurrent.futures
import time

class CombinedLinkExtractor:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def extract_all_links(self, url):
        """Extract all links using the fastest method available"""
        try:
            print(f"🚀 Fast link extraction for: {url}")
            start_time = time.time()
            
            # Use requests + BeautifulSoup for speed
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            base_domain = urlparse(url).netloc
            
            internal_links = []
            external_links = []
            
            # Extract all links in parallel
            links = soup.find_all('a', href=True)
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                futures = []
                for link in links:
                    future = executor.submit(self._process_link, link, url, base_domain)
                    futures.append(future)
                
                for future in concurrent.futures.as_completed(futures):
                    try:
                        result = future.result()
                        if result:
                            if result['type'] == 'internal':
                                internal_links.append(result['data'])
                            else:
                                external_links.append(result['data'])
                    except Exception as e:
                        continue
            
            # Remove duplicates
            internal_links = self._remove_duplicates(internal_links)
            external_links = self._remove_duplicates(external_links)
            
            elapsed = time.time() - start_time
            print(f"⚡ Extracted {len(internal_links)} internal and {len(external_links)} external links in {elapsed:.2f}s")
            
            return {
                'internal_links': internal_links,
                'external_links': external_links,
                'total_links': len(internal_links) + len(external_links),
                'processing_time': elapsed
            }
            
        except Exception as e:
            print(f"❌ Link extraction failed: {e}")
            return {
                'internal_links': [],
                'external_links': [],
                'total_links': 0,
                'error': str(e)
            }
    
    def _process_link(self, link, base_url, base_domain):
        """Process individual link"""
        try:
            href = link.get('href', '').strip()
            if not href or href.startswith('#') or href.startswith('javascript:') or href.startswith('mailto:'):
                return None
            
            # Convert relative URLs to absolute
            absolute_url = urljoin(base_url, href)
            parsed_url = urlparse(absolute_url)
            
            # Skip non-http protocols
            if parsed_url.scheme not in ['http', 'https']:
                return None
            
            link_data = {
                'url': absolute_url,
                'text': link.get_text(strip=True)[:100],
                'title': link.get('title', ''),
                'rel': link.get('rel', []),
                'target': link.get('target', '')
            }
            
            # Determine if internal or external
            if parsed_url.netloc == base_domain:
                return {'type': 'internal', 'data': link_data}
            else:
                return {'type': 'external', 'data': link_data}
                
        except Exception:
            return None
    
    def _remove_duplicates(self, links):
        """Remove duplicate links"""
        seen_urls = set()
        unique_links = []
        
        for link in links:
            if link['url'] not in seen_urls:
                seen_urls.add(link['url'])
                unique_links.append(link)
        
        return unique_links
