from selenium import webdriver
from selenium.webdriver.common.by import By
from urllib.parse import urljoin, urlparse
import time

def extract_domain_urls_from_forms(url):
    """Extract domain URLs from form action attributes"""
    driver = webdriver.Chrome()
    driver.get(url)
    forms = driver.find_elements(By.TAG_NAME, "form")
    domain_urls = set()  # Use set to avoid duplicates
    
    for i, form in enumerate(forms):
        try:
            # Get form action attribute
            action = form.get_attribute("action")
            method = form.get_attribute("method") or "GET"
            
            if action:
                # Convert relative URLs to absolute URLs
                absolute_url = urljoin(url, action)
                # Extract domain from the URL
                parsed_url = urlparse(absolute_url)
                domain_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
                domain_urls.add(domain_url)
            else:
                # If no action, form submits to current page domain
                parsed_url = urlparse(url)
                domain_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
                domain_urls.add(domain_url)
                
        except Exception as e:
            print(f"Error processing form {i}: {str(e)}")
            continue
    
    driver.quit()
    return list(domain_urls)

def extract_forms_from_url(url):
    """Legacy function for backward compatibility"""
    driver = webdriver.Chrome()
    driver.get(url)
    forms = driver.find_elements(By.TAG_NAME, "form")
    links = []
    for i, form in enumerate(forms):
        form_id = form.get_attribute("id") or f"form{i}"
        links.append(f"{url}#{form_id}")
    driver.quit()
    return links

def extract_detailed_form_info(url):
    """Extract detailed form information including domains, actions, and methods"""
    driver = webdriver.Chrome()
    driver.get(url)
    forms = driver.find_elements(By.TAG_NAME, "form")
    form_details = []
    
    for i, form in enumerate(forms):
        try:
            action = form.get_attribute("action") or ""
            method = form.get_attribute("method") or "GET"
            form_id = form.get_attribute("id") or f"form{i}"
            form_name = form.get_attribute("name") or ""
            
            # Convert relative URLs to absolute URLs
            if action:
                absolute_url = urljoin(url, action)
            else:
                absolute_url = url
                
            # Extract domain from the URL
            parsed_url = urlparse(absolute_url)
            domain_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
            
            # Count form inputs
            inputs = form.find_elements(By.TAG_NAME, "input")
            textareas = form.find_elements(By.TAG_NAME, "textarea")
            selects = form.find_elements(By.TAG_NAME, "select")
            
            form_info = {
                'id': form_id,
                'name': form_name,
                'action': absolute_url,
                'method': method.upper(),
                'domain': domain_url,
                'input_count': len(inputs),
                'textarea_count': len(textareas),
                'select_count': len(selects),
                'total_fields': len(inputs) + len(textareas) + len(selects)
            }
            
            form_details.append(form_info)
            
        except Exception as e:
            print(f"Error processing form {i}: {str(e)}")
            continue
    
    driver.quit()
    return form_details

def autofill_and_validate_form(link, index):
    logs = []
    logs.append("✔ Autofill started")

    driver = webdriver.Chrome()
    driver.get(link)

    time.sleep(2)

    if "google-analytics.com" in driver.page_source:
        logs.append("✔ Google Analytics detected")
        logs.append("✔ GA Event Fired: form_start")

    if "adobe" in driver.page_source.lower():
        logs.append("✔ Adobe Analytics script detected")
        logs.append("✔ Adobe Event: trackSubmit")

    inputs = driver.find_elements(By.TAG_NAME, "input")
    for idx, field in enumerate(inputs):
        try:
            field_type = field.get_attribute("type")
            if field_type in ['text', 'email']:
                field.send_keys("demo@xatform.com" if "email" in field_type else "Test Name")
                logs.append(f"✔ Input field {idx + 1}: {field.get_attribute('name') or 'Unnamed'} autofilled")
        except Exception as e:
            logs.append(f"✘ Error autofilling field {idx + 1}: {str(e)}")

    submit_buttons = driver.find_elements(By.XPATH, "//input[@type='submit'] | //button[@type='submit']")
    if submit_buttons:
        try:
            submit_buttons[0].click()
            logs.append("✔ Form submitted")
        except:
            logs.append("✘ Form submission failed")

    time.sleep(2)
    driver.quit()
    return logs
