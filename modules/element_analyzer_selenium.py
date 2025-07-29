from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
import time

class ElementAnalyzerSelenium:
    def __init__(self):
        self.driver = None
    
    def _setup_driver(self):
        """Setup Chrome driver with options"""
        try:
            chrome_options = Options()
            chrome_options.add_argument('--headless')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--window-size=1920,1080')
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            return True
        except Exception as e:
            print(f"❌ Failed to setup Chrome driver: {e}")
            return False
    
    def analyze_elements(self, url):
        """Analyze page elements using Selenium"""
        if not self._setup_driver():
            raise Exception("Failed to setup Selenium driver")
        
        try:
            print(f"🔍 Analyzing elements with Selenium: {url}")
            
            self.driver.get(url)
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # Wait for page to load completely
            time.sleep(2)
            
            elements_data = {
                'page_info': self._get_page_info(),
                'headings': self._analyze_headings(),
                'images': self._analyze_images(),
                'forms': self._analyze_forms(),
                'links': self._analyze_links_selenium(),
                'meta_tags': self._analyze_meta_tags(),
                'performance': self._analyze_performance(),
                'accessibility': self._analyze_accessibility()
            }
            
            print("✅ Selenium element analysis complete")
            return elements_data
            
        except Exception as e:
            print(f"❌ Selenium analysis failed: {e}")
            raise e
        finally:
            if self.driver:
                self.driver.quit()
    
    def _get_page_info(self):
        """Get basic page information"""
        return {
            'title': self.driver.title,
            'url': self.driver.current_url,
            'page_source_length': len(self.driver.page_source)
        }
    
    def _analyze_headings(self):
        """Analyze heading structure"""
        headings = {}
        for i in range(1, 7):
            elements = self.driver.find_elements(By.TAG_NAME, f'h{i}')
            headings[f'h{i}'] = [elem.text.strip() for elem in elements if elem.text.strip()]
        
        return {
            'structure': headings,
            'total_headings': sum(len(h) for h in headings.values()),
            'has_h1': len(headings.get('h1', [])) > 0,
            'multiple_h1': len(headings.get('h1', [])) > 1
        }
    
    def _analyze_images(self):
        """Analyze images on the page"""
        images = self.driver.find_elements(By.TAG_NAME, 'img')
        
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
        forms = self.driver.find_elements(By.TAG_NAME, 'form')
        
        form_data = []
        for form in forms:
            inputs = form.find_elements(By.TAG_NAME, 'input')
            textareas = form.find_elements(By.TAG_NAME, 'textarea')
            selects = form.find_elements(By.TAG_NAME, 'select')
            
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
    
    def _analyze_links_selenium(self):
        """Analyze links using Selenium"""
        links = self.driver.find_elements(By.TAG_NAME, 'a')
        
        internal_count = 0
        external_count = 0
        empty_links = 0
        
        current_domain = self.driver.current_url.split('/')[2]
        
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
        meta_tags = self.driver.find_elements(By.TAG_NAME, 'meta')
        
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
            # Get page load time
            navigation_start = self.driver.execute_script("return window.performance.timing.navigationStart")
            load_complete = self.driver.execute_script("return window.performance.timing.loadEventEnd")
            
            load_time = (load_complete - navigation_start) / 1000 if load_complete > 0 else 0
            
            return {
                'page_load_time': load_time,
                'dom_elements': len(self.driver.find_elements(By.XPATH, "//*")),
                'scripts': len(self.driver.find_elements(By.TAG_NAME, 'script')),
                'stylesheets': len(self.driver.find_elements(By.TAG_NAME, 'link'))
            }
        except:
            return {'error': 'Performance data unavailable'}
    
    def _analyze_accessibility(self):
        """Basic accessibility analysis"""
        try:
            # Check for common accessibility issues
            images_without_alt = len(self.driver.find_elements(By.XPATH, "//img[not(@alt) or @alt='']"))
            links_without_text = len(self.driver.find_elements(By.XPATH, "//a[not(text()) and not(@aria-label) and not(@title)]"))
            
            return {
                'images_without_alt': images_without_alt,
                'links_without_text': links_without_text,
                'has_skip_links': len(self.driver.find_elements(By.XPATH, "//a[contains(@href, '#') and (contains(text(), 'skip') or contains(@class, 'skip'))]")) > 0
            }
        except:
            return {'error': 'Accessibility analysis unavailable'}
