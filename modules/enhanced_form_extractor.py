import asyncio
import json
import time
from urllib.parse import urljoin, urlparse, urlunparse
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import requests
from typing import List, Dict, Any, Set

class EnhancedFormExtractor:
    def __init__(self, max_pages: int = 50, max_depth: int = 3):
        self.max_pages = max_pages
        self.max_depth = max_depth
        self.visited_urls: Set[str] = set()
        self.found_forms: List[Dict[str, Any]] = []
        self.base_domain = ""
        
    def normalize_url(self, url: str) -> str:
        """Normalize URL by removing fragment and query parameters for deduplication"""
        parsed = urlparse(url)
        return urlunparse((parsed.scheme, parsed.netloc, parsed.path, '', '', ''))
    
    def is_same_domain(self, url: str, base_url: str) -> bool:
        """Check if URL belongs to the same domain as base URL"""
        return urlparse(url).netloc == urlparse(base_url).netloc
    
    async def extract_forms_from_page(self, page, url: str) -> List[Dict[str, Any]]:
        """Extract detailed form information from a single page"""
        forms_data = []
        
        try:
            # Wait for page to load completely
            await page.wait_for_load_state('networkidle', timeout=10000)
            
            # Get all forms on the page
            forms = await page.query_selector_all('form')
            
            for i, form in enumerate(forms):
                try:
                    form_data = {
                        'url': url,
                        'form_index': i,
                        'form_id': await form.get_attribute('id') or f'form_{i}',
                        'form_name': await form.get_attribute('name') or '',
                        'action': await form.get_attribute('action') or '',
                        'method': (await form.get_attribute('method') or 'GET').upper(),
                        'enctype': await form.get_attribute('enctype') or 'application/x-www-form-urlencoded',
                        'fields': [],
                        'buttons': [],
                        'has_file_upload': False,
                        'has_required_fields': False,
                        'field_count': 0
                    }
                    
                    # Make action URL absolute
                    if form_data['action']:
                        form_data['action'] = urljoin(url, form_data['action'])
                    
                    # Extract form fields
                    inputs = await form.query_selector_all('input, textarea, select')
                    
                    for input_elem in inputs:
                        field_type = await input_elem.get_attribute('type') or 'text'
                        field_name = await input_elem.get_attribute('name') or ''
                        field_id = await input_elem.get_attribute('id') or ''
                        placeholder = await input_elem.get_attribute('placeholder') or ''
                        required = await input_elem.get_attribute('required') is not None
                        
                        if field_type not in ['submit', 'button', 'reset']:
                            field_data = {
                                'type': field_type,
                                'name': field_name,
                                'id': field_id,
                                'placeholder': placeholder,
                                'required': required,
                                'tag': await input_elem.evaluate('el => el.tagName.toLowerCase()')
                            }
                            
                            # Check for labels
                            if field_id:
                                label = await page.query_selector(f'label[for="{field_id}"]')
                                if label:
                                    field_data['label'] = await label.text_content()
                            
                            # Special handling for select elements
                            if field_data['tag'] == 'select':
                                options = await input_elem.query_selector_all('option')
                                field_data['options'] = []
                                for option in options:
                                    option_text = await option.text_content()
                                    option_value = await option.get_attribute('value')
                                    field_data['options'].append({
                                        'text': option_text.strip() if option_text else '',
                                        'value': option_value or ''
                                    })
                            
                            form_data['fields'].append(field_data)
                            
                            if field_type == 'file':
                                form_data['has_file_upload'] = True
                            if required:
                                form_data['has_required_fields'] = True
                        else:
                            # Handle buttons
                            button_data = {
                                'type': field_type,
                                'name': field_name,
                                'value': await input_elem.get_attribute('value') or '',
                                'text': await input_elem.text_content() or ''
                            }
                            form_data['buttons'].append(button_data)
                    
                    # Also check for button elements
                    buttons = await form.query_selector_all('button')
                    for button in buttons:
                        button_type = await button.get_attribute('type') or 'button'
                        button_text = await button.text_content() or ''
                        button_data = {
                            'type': button_type,
                            'name': await button.get_attribute('name') or '',
                            'value': await button.get_attribute('value') or '',
                            'text': button_text.strip()
                        }
                        form_data['buttons'].append(button_data)
                    
                    form_data['field_count'] = len(form_data['fields'])
                    
                    # Generate form link for easy access
                    if form_data['form_id'] and form_data['form_id'] != f'form_{i}':
                        form_data['form_link'] = f"{url}#{form_data['form_id']}"
                    else:
                        form_data['form_link'] = f"{url}#form_{i}"
                    
                    forms_data.append(form_data)
                    
                except Exception as e:
                    print(f"Error extracting form {i} from {url}: {e}")
                    continue
            
        except Exception as e:
            print(f"Error extracting forms from {url}: {e}")
        
        return forms_data
    
    async def get_page_links(self, page, base_url: str) -> List[str]:
        """Extract all internal links from a page"""
        links = []
        try:
            # Get all anchor tags with href
            anchors = await page.query_selector_all('a[href]')
            
            for anchor in anchors:
                href = await anchor.get_attribute('href')
                if href:
                    # Make URL absolute
                    absolute_url = urljoin(base_url, href)
                    
                    # Only include same-domain links
                    if self.is_same_domain(absolute_url, base_url):
                        normalized_url = self.normalize_url(absolute_url)
                        if normalized_url not in self.visited_urls:
                            links.append(normalized_url)
        
        except Exception as e:
            print(f"Error extracting links from {base_url}: {e}")
        
        return links
    
    async def crawl_website(self, start_url: str) -> Dict[str, Any]:
        """Crawl website to find all forms"""
        self.base_domain = urlparse(start_url).netloc
        self.visited_urls.clear()
        self.found_forms.clear()
        
        async with async_playwright() as p:
            # Launch browser
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            )
            
            # URLs to visit (queue)
            urls_to_visit = [self.normalize_url(start_url)]
            current_depth = 0
            
            try:
                while urls_to_visit and len(self.visited_urls) < self.max_pages and current_depth < self.max_depth:
                    current_level_urls = urls_to_visit.copy()
                    urls_to_visit.clear()
                    
                    for url in current_level_urls:
                        if url in self.visited_urls:
                            continue
                        
                        self.visited_urls.add(url)
                        print(f"🔍 Crawling: {url} (depth: {current_depth})")
                        
                        try:
                            page = await context.new_page()
                            
                            # Set timeout and navigate
                            await page.goto(url, timeout=15000, wait_until='domcontentloaded')
                            
                            # Extract forms from this page
                            page_forms = await self.extract_forms_from_page(page, url)
                            self.found_forms.extend(page_forms)
                            
                            # Get links for next level (only if we haven't reached max depth)
                            if current_depth < self.max_depth - 1:
                                page_links = await self.get_page_links(page, url)
                                urls_to_visit.extend(page_links)
                            
                            await page.close()
                            
                        except Exception as e:
                            print(f"❌ Error crawling {url}: {e}")
                            continue
                    
                    current_depth += 1
                    
                    # Remove duplicates from next level
                    urls_to_visit = list(set(urls_to_visit) - self.visited_urls)
            
            finally:
                await browser.close()
        
        # Prepare results
        results = {
            'start_url': start_url,
            'pages_crawled': len(self.visited_urls),
            'forms_found': len(self.found_forms),
            'forms': self.found_forms,
            'crawl_summary': {
                'total_pages': len(self.visited_urls),
                'pages_with_forms': len(set(form['url'] for form in self.found_forms)),
                'total_forms': len(self.found_forms),
                'forms_by_method': {},
                'forms_with_file_upload': sum(1 for form in self.found_forms if form['has_file_upload']),
                'forms_with_required_fields': sum(1 for form in self.found_forms if form['has_required_fields']),
                'average_fields_per_form': sum(form['field_count'] for form in self.found_forms) / len(self.found_forms) if self.found_forms else 0
            }
        }
        
        # Count forms by method
        for form in self.found_forms:
            method = form['method']
            results['crawl_summary']['forms_by_method'][method] = results['crawl_summary']['forms_by_method'].get(method, 0) + 1
        
        return results
    
    async def extract_single_page_forms(self, url: str) -> Dict[str, Any]:
        """Extract forms from a single page (faster option)"""
        self.found_forms.clear()
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            )
            
            try:
                page = await context.new_page()
                await page.goto(url, timeout=15000, wait_until='domcontentloaded')
                
                forms = await self.extract_forms_from_page(page, url)
                self.found_forms.extend(forms)
                
                await page.close()
                
            finally:
                await browser.close()
        
        return {
            'url': url,
            'forms_found': len(self.found_forms),
            'forms': self.found_forms,
            'summary': {
                'total_forms': len(self.found_forms),
                'forms_by_method': {},
                'forms_with_file_upload': sum(1 for form in self.found_forms if form['has_file_upload']),
                'forms_with_required_fields': sum(1 for form in self.found_forms if form['has_required_fields']),
                'average_fields_per_form': sum(form['field_count'] for form in self.found_forms) / len(self.found_forms) if self.found_forms else 0
            }
        }

# Async wrapper functions for Flask
def crawl_website_sync(url: str, max_pages: int = 50, max_depth: int = 3) -> Dict[str, Any]:
    """Synchronous wrapper for crawling website"""
    extractor = EnhancedFormExtractor(max_pages=max_pages, max_depth=max_depth)
    return asyncio.run(extractor.crawl_website(url))

def extract_single_page_forms_sync(url: str) -> Dict[str, Any]:
    """Synchronous wrapper for single page form extraction"""
    extractor = EnhancedFormExtractor()
    return asyncio.run(extractor.extract_single_page_forms(url))