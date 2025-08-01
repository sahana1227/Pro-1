import asyncio
import random
import time
from typing import Dict, List, Any
from playwright.async_api import async_playwright
from urllib.parse import urlparse

class EnhancedAutofill:
    def __init__(self):
        self.sample_data = {
            'text': ['John Doe', 'Jane Smith', 'Alex Johnson', 'Sarah Wilson', 'Michael Brown'],
            'email': ['test@example.com', 'demo@testsite.com', 'sample@email.com', 'user@domain.com'],
            'tel': ['+1-555-123-4567', '+1-555-987-6543', '+1-555-456-7890'],
            'number': ['123', '456', '789', '100', '50'],
            'url': ['https://example.com', 'https://testsite.com', 'https://demo.com'],
            'date': ['2024-01-15', '2024-06-20', '2024-12-25'],
            'time': ['10:30', '14:45', '09:15'],
            'password': ['TestPass123!', 'SecurePass456@', 'DemoPassword789#'],
            'search': ['search term', 'test query', 'sample search'],
            'textarea': ['This is a sample text for textarea fields. It contains multiple sentences to test the field properly.']
        }
        
        self.select_options = {
            'country': ['United States', 'Canada', 'United Kingdom', 'Australia'],
            'state': ['California', 'New York', 'Texas', 'Florida'],
            'gender': ['Male', 'Female', 'Other'],
            'title': ['Mr.', 'Ms.', 'Dr.', 'Prof.'],
            'month': ['January', 'February', 'March', 'April', 'May', 'June']
        }
    
    def get_sample_value(self, field_type: str, field_name: str = '', placeholder: str = '') -> str:
        """Get appropriate sample value based on field type and context"""
        field_type = field_type.lower()
        field_name = field_name.lower()
        placeholder = placeholder.lower()
        
        # Check for specific field names or placeholders
        if any(keyword in field_name or keyword in placeholder for keyword in ['email', 'mail']):
            return random.choice(self.sample_data['email'])
        elif any(keyword in field_name or keyword in placeholder for keyword in ['phone', 'tel', 'mobile']):
            return random.choice(self.sample_data['tel'])
        elif any(keyword in field_name or keyword in placeholder for keyword in ['name', 'first', 'last']):
            return random.choice(self.sample_data['text'])
        elif any(keyword in field_name or keyword in placeholder for keyword in ['url', 'website', 'link']):
            return random.choice(self.sample_data['url'])
        elif any(keyword in field_name or keyword in placeholder for keyword in ['age', 'year', 'count', 'quantity']):
            return random.choice(self.sample_data['number'])
        
        # Default based on field type
        if field_type in self.sample_data:
            return random.choice(self.sample_data[field_type])
        elif field_type == 'textarea':
            return random.choice(self.sample_data['textarea'])
        else:
            return random.choice(self.sample_data['text'])
    
    def get_select_option(self, options: List[Dict], field_name: str = '') -> str:
        """Select appropriate option from select field"""
        if not options:
            return ''
        
        field_name = field_name.lower()
        
        # Try to find contextually appropriate option
        for category, values in self.select_options.items():
            if category in field_name:
                for option in options:
                    if any(value.lower() in option['text'].lower() for value in values):
                        return option['value'] or option['text']
        
        # If no contextual match, select a non-empty option (skip first if it's empty/placeholder)
        valid_options = [opt for opt in options if opt['text'].strip() and opt['text'].lower() not in ['select', 'choose', 'pick', '']]
        if valid_options:
            return random.choice(valid_options)['value'] or random.choice(valid_options)['text']
        elif len(options) > 1:
            return options[1]['value'] or options[1]['text']
        
        return options[0]['value'] or options[0]['text']
    
    async def autofill_form(self, form_data: Dict[str, Any]) -> List[str]:
        """Autofill a single form and return logs"""
        logs = []
        url = form_data['url']
        form_index = form_data['form_index']
        
        logs.append(f"🚀 Starting autofill for form {form_index} on {url}")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            )
            
            try:
                page = await context.new_page()
                
                # Navigate to the page
                await page.goto(url, timeout=15000, wait_until='domcontentloaded')
                logs.append(f"✅ Successfully loaded page: {url}")
                
                # Wait a bit for any dynamic content
                await page.wait_for_timeout(2000)
                
                # Find the specific form
                forms = await page.query_selector_all('form')
                if form_index >= len(forms):
                    logs.append(f"❌ Form {form_index} not found on page")
                    return logs
                
                target_form = forms[form_index]
                logs.append(f"✅ Found target form {form_index}")
                
                # Check for analytics/tracking
                page_content = await page.content()
                if "google-analytics" in page_content.lower() or "gtag" in page_content.lower():
                    logs.append("📊 Google Analytics detected")
                if "adobe" in page_content.lower():
                    logs.append("📊 Adobe Analytics detected")
                if "facebook" in page_content.lower() and "pixel" in page_content.lower():
                    logs.append("📊 Facebook Pixel detected")
                
                filled_fields = 0
                
                # Fill form fields
                for field in form_data['fields']:
                    try:
                        field_selector = None
                        
                        # Try different selectors to find the field
                        if field['id']:
                            field_selector = f"#{field['id']}"
                        elif field['name']:
                            field_selector = f"[name='{field['name']}']"
                        
                        if not field_selector:
                            logs.append(f"⚠️ Skipping field without ID or name")
                            continue
                        
                        # Find the field within the form
                        field_element = await target_form.query_selector(field_selector)
                        if not field_element:
                            logs.append(f"⚠️ Field not found: {field_selector}")
                            continue
                        
                        # Handle different field types
                        if field['tag'] == 'select':
                            if field.get('options'):
                                selected_value = self.get_select_option(field['options'], field['name'])
                                await field_element.select_option(value=selected_value)
                                logs.append(f"✅ Selected '{selected_value}' in {field['name'] or field['id']}")
                                filled_fields += 1
                        
                        elif field['tag'] == 'textarea':
                            sample_text = self.get_sample_value('textarea', field['name'], field['placeholder'])
                            await field_element.fill(sample_text)
                            logs.append(f"✅ Filled textarea {field['name'] or field['id']}")
                            filled_fields += 1
                        
                        elif field['type'] in ['text', 'email', 'tel', 'number', 'url', 'search', 'password']:
                            sample_value = self.get_sample_value(field['type'], field['name'], field['placeholder'])
                            await field_element.fill(sample_value)
                            logs.append(f"✅ Filled {field['type']} field '{field['name'] or field['id']}' with '{sample_value}'")
                            filled_fields += 1
                        
                        elif field['type'] == 'checkbox':
                            # Randomly check some checkboxes
                            if random.choice([True, False]):
                                await field_element.check()
                                logs.append(f"✅ Checked checkbox '{field['name'] or field['id']}'")
                                filled_fields += 1
                        
                        elif field['type'] == 'radio':
                            # For radio buttons, we need to select one from the group
                            radio_name = field['name']
                            if radio_name:
                                radio_buttons = await target_form.query_selector_all(f"input[name='{radio_name}'][type='radio']")
                                if radio_buttons:
                                    selected_radio = random.choice(radio_buttons)
                                    await selected_radio.check()
                                    logs.append(f"✅ Selected radio button in group '{radio_name}'")
                                    filled_fields += 1
                        
                        elif field['type'] == 'date':
                            sample_date = self.get_sample_value('date')
                            await field_element.fill(sample_date)
                            logs.append(f"✅ Filled date field '{field['name'] or field['id']}' with '{sample_date}'")
                            filled_fields += 1
                        
                        elif field['type'] == 'time':
                            sample_time = self.get_sample_value('time')
                            await field_element.fill(sample_time)
                            logs.append(f"✅ Filled time field '{field['name'] or field['id']}' with '{sample_time}'")
                            filled_fields += 1
                        
                        # Wait a bit between fields to simulate human behavior
                        await page.wait_for_timeout(random.randint(100, 500))
                        
                    except Exception as e:
                        logs.append(f"❌ Error filling field '{field.get('name', 'unknown')}': {str(e)}")
                
                logs.append(f"📊 Successfully filled {filled_fields} out of {len(form_data['fields'])} fields")
                
                # Try to submit the form
                submit_attempted = False
                
                # Look for submit buttons in the form
                for button in form_data['buttons']:
                    if button['type'] in ['submit']:
                        try:
                            if button['name']:
                                submit_btn = await target_form.query_selector(f"input[name='{button['name']}'][type='submit'], button[name='{button['name']}'][type='submit']")
                            else:
                                submit_btn = await target_form.query_selector("input[type='submit'], button[type='submit']")
                            
                            if submit_btn:
                                # Check if button is visible and enabled
                                is_visible = await submit_btn.is_visible()
                                is_enabled = await submit_btn.is_enabled()
                                
                                if is_visible and is_enabled:
                                    logs.append(f"🔄 Attempting to submit form...")
                                    await submit_btn.click()
                                    submit_attempted = True
                                    
                                    # Wait for potential redirect or response
                                    await page.wait_for_timeout(3000)
                                    
                                    # Check if we're still on the same page or redirected
                                    current_url = page.url
                                    if current_url != url:
                                        logs.append(f"✅ Form submitted successfully - redirected to: {current_url}")
                                    else:
                                        logs.append(f"✅ Form submitted - remained on same page")
                                    
                                    break
                                else:
                                    logs.append(f"⚠️ Submit button found but not clickable (visible: {is_visible}, enabled: {is_enabled})")
                        except Exception as e:
                            logs.append(f"❌ Error clicking submit button: {str(e)}")
                
                if not submit_attempted:
                    logs.append("⚠️ No clickable submit button found - form filled but not submitted")
                
                # Check for any validation messages or errors
                try:
                    # Look for common validation message selectors
                    validation_selectors = [
                        '.error', '.validation-error', '.field-error',
                        '.alert-danger', '.alert-error', '.text-danger',
                        '[role="alert"]', '.invalid-feedback'
                    ]
                    
                    for selector in validation_selectors:
                        error_elements = await page.query_selector_all(selector)
                        for error_element in error_elements:
                            if await error_element.is_visible():
                                error_text = await error_element.text_content()
                                if error_text and error_text.strip():
                                    logs.append(f"⚠️ Validation message: {error_text.strip()}")
                except Exception as e:
                    logs.append(f"⚠️ Could not check for validation messages: {str(e)}")
                
            except Exception as e:
                logs.append(f"❌ Critical error during autofill: {str(e)}")
            
            finally:
                await browser.close()
        
        logs.append(f"🏁 Autofill process completed for form {form_index}")
        return logs

# Synchronous wrapper for Flask
def autofill_form_sync(form_data: Dict[str, Any]) -> List[str]:
    """Synchronous wrapper for form autofill"""
    autofill = EnhancedAutofill()
    return asyncio.run(autofill.autofill_form(form_data))