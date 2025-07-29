from playwright.sync_api import sync_playwright
import time

class ElementAnalyzerPlaywright:
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.page = None
    
    def analyze_elements(self, url):
        """Analyze page elements using Playwright"""
        try:
            print(f"🔍 Analyzing elements with Playwright: {url}")
            
            with sync_playwright() as p:
                self.browser = p.chromium.launch(headless=True)
                self.page = self.browser.new_page()
                
                # Set user agent
                self.page.set_extra_http_headers({
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })
                
                self.page.goto(url, wait_until='networkidle')
                
                elements_data = {
                    'page_info': self._get_page_info(),
                    'headings': self._analyze_headings(),
                    'images': self._analyze_images(),
                    'forms': self._analyze_forms(),
                    'links': self._analyze_links_playwright(),
                    'meta_tags': self._analyze_meta_tags(),
                    'performance': self._analyze_performance(),
                    'accessibility': self._analyze_accessibility()
                }
                
                print("✅ Playwright element analysis complete")
                return elements_data
                
        except Exception as e:
            print(f"❌ Playwright analysis failed: {e}")
            raise e
        finally:
            if self.browser:
                self.browser.close()
    
    def _get_page_info(self):
        """Get basic page information"""
        return {
            'title': self.page.title(),
            'url': self.page.url,
            'viewport': self.page.viewport_size
        }
    
    def _analyze_headings(self):
        """Analyze heading structure"""
        headings = {}
        for i in range(1, 7):
            elements = self.page.query_selector_all(f'h{i}')
            headings[f'h{i}'] = [elem.inner_text().strip() for elem in elements if elem.inner_text().strip()]
        
        return {
            'structure': headings,
            'total_headings': sum(len(h) for h in headings.values()),
            'has_h1': len(headings.get('h1', [])) > 0,
            'multiple_h1': len(headings.get('h1', [])) > 1
        }
    
    def _analyze_images(self):
        """Analyze images on the page"""
        images = self.page.query_selector_all('img')
        
        image_data = []
        missing_alt = 0
        
        for img in images[:20]:  # Limit to first 20 images
            src = img.get_attribute('src')
            alt = img.get_attribute('alt')
            
            if not alt:
                missing_alt += 1
            
            image_data.append({
                'src': src,
                'alt': alt or '',
                'width': img.get_attribute('width'),
                'height': img.get_attribute('height')
            })
        
        return {
            'total_images': len(images),
            'images_sample': image_data,
            'missing_alt_text': missing_alt,
            'alt_text_percentage': ((len(images) - missing_alt) / len(images) * 100) if images else 0
        }
    
    def _analyze_forms(self):
        """Analyze forms on the page"""
        forms = self.page.query_selector_all('form')
        
        form_data = []
        for form in forms:
            inputs = form.query_selector_all('input')
            textareas = form.query_selector_all('textarea')
            selects = form.query_selector_all('select')
            
            form_data.append({
                'action': form.get_attribute('action'),
                'method': form.get_attribute('method'),
                'inputs': len(inputs),
                'textareas': len(textareas),
                'selects': len(selects)
            })
        
        return {
            'total_forms': len(forms),
            'forms_details': form_data
        }
    
    def _analyze_links_playwright(self):
        """Analyze links using Playwright"""
        links = self.page.query_selector_all('a')
        
        internal_count = 0
        external_count = 0
        empty_links = 0
        
        current_domain = self.page.url.split('/')[2]
        
        for link in links:
            href = link.get_attribute('href')
            if not href:
                empty_links += 1
            elif current_domain in href:
                internal_count += 1
            else:
                external_count += 1
        
        return {
            'total_links': len(links),
            'internal_links': internal_count,
            'external_links': external_count,
            'empty_links': empty_links
        }
    
    def _analyze_meta_tags(self):
        """Analyze meta tags"""
        meta_tags = self.page.query_selector_all('meta')
        
        meta_data = {}
        for meta in meta_tags:
            name = meta.get_attribute('name') or meta.get_attribute('property')
            content = meta.get_attribute('content')
            if name and content:
                meta_data[name] = content
        
        return {
            'total_meta_tags': len(meta_tags),
            'important_tags': {
                'description': meta_data.get('description', ''),
                'keywords': meta_data.get('keywords', ''),
                'viewport': meta_data.get('viewport', ''),
                'robots': meta_data.get('robots', '')
            }
        }
    
    def _analyze_performance(self):
        """Basic performance analysis"""
        try:
            # Get performance metrics
            metrics = self.page.evaluate("""
                () => {
                    const timing = performance.timing;
                    return {
                        loadTime: timing.loadEventEnd - timing.navigationStart,
                        domElements: document.querySelectorAll('*').length,
                        scripts: document.querySelectorAll('script').length,
                        stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length
                    };
                }
            """)
            
            return {
                'page_load_time': metrics['loadTime'] / 1000,
                'dom_elements': metrics['domElements'],
                'scripts': metrics['scripts'],
                'stylesheets': metrics['stylesheets']
            }
        except:
            return {'error': 'Performance data unavailable'}
    
    def _analyze_accessibility(self):
        """Basic accessibility analysis"""
        try:
            accessibility_data = self.page.evaluate("""
                () => {
                    const imagesWithoutAlt = document.querySelectorAll('img:not([alt]), img[alt=""]').length;
                    const linksWithoutText = document.querySelectorAll('a:not([aria-label]):not([title])').length;
                    const skipLinks = document.querySelectorAll('a[href*="#"][class*="skip"], a[href*="#"]:contains("skip")').length;
                    
                    return {
                        imagesWithoutAlt: imagesWithoutAlt,
                        linksWithoutText: linksWithoutText,
                        hasSkipLinks: skipLinks > 0
                    };
                }
            """)
            
            return {
                'images_without_alt': accessibility_data['imagesWithoutAlt'],
                'links_without_text': accessibility_data['linksWithoutText'],
                'has_skip_links': accessibility_data['hasSkipLinks']
            }
        except:
            return {'error': 'Accessibility analysis unavailable'}
