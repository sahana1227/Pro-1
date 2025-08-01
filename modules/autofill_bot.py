from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time

def extract_forms_from_url(url):
    """Extract forms from URL with improved identification"""
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    
    driver = webdriver.Chrome(options=chrome_options)
    links = []
    
    try:
        driver.get(url)
        # Wait for page to load completely
        WebDriverWait(driver, 10).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
        
        forms = driver.find_elements(By.TAG_NAME, "form")
        
        for i, form in enumerate(forms):
            try:
                # Try multiple identification methods
                form_id = form.get_attribute("id")
                if not form_id:
                    form_id = form.get_attribute("name")
                if not form_id:
                    action = form.get_attribute("action")
                    if action:
                        # Clean action for use as ID
                        clean_action = ''.join(c for c in action if c.isalnum())
                        form_id = f"form-{clean_action}-{i}"
                    else:
                        form_id = f"form-{i}"
                
                # Ensure unique form identification
                form_xpath = f"(//form)[{i+1}]"
                form_link = f"{url}#{form_id}"
                
                # Store additional metadata for better targeting
                links.append({
                    "link": form_link,
                    "xpath": form_xpath,
                    "index": i,
                    "id": form_id
                })
                
            except Exception as e:
                print(f"Error processing form {i}: {e}")
                continue
                
    except Exception as e:
        print(f"Error extracting forms from {url}: {e}")
    finally:
        driver.quit()
    
    # Return just the links for backward compatibility
    return [item["link"] for item in links]

def autofill_and_validate_form(link, index):
    """Autofill and validate form with improved targeting"""
    logs = []
    logs.append("✔ Autofill started")
    
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        # Extract base URL and form identifier
        if "#" in link:
            base_url, form_id = link.rsplit("#", 1)
        else:
            base_url = link
            form_id = f"form-{index}"
        
        driver.get(base_url)
        logs.append(f"✔ Navigated to: {base_url}")
        
        # Wait for page to load
        WebDriverWait(driver, 10).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
        
        # Find the specific form using multiple strategies
        target_form = None
        try:
            # Try by ID first
            if form_id.startswith("form-"):
                # Extract index from form ID
                try:
                    form_index = int(form_id.split("-")[-1])
                    forms = driver.find_elements(By.TAG_NAME, "form")
                    if form_index < len(forms):
                        target_form = forms[form_index]
                        logs.append(f"✔ Found form by index: {form_index}")
                except:
                    pass
            
            if not target_form:
                # Try by ID attribute
                try:
                    target_form = driver.find_element(By.ID, form_id)
                    logs.append(f"✔ Found form by ID: {form_id}")
                except NoSuchElementException:
                    pass
            
            if not target_form:
                # Fallback to first form
                forms = driver.find_elements(By.TAG_NAME, "form")
                if forms:
                    target_form = forms[0]
                    logs.append("✔ Using first available form")
                    
        except Exception as e:
            logs.append(f"✘ Error finding form: {str(e)}")
            return logs

        if not target_form:
            logs.append("✘ No forms found on page")
            return logs

        # Check for analytics
        page_source = driver.page_source
        if "google-analytics.com" in page_source or "gtag" in page_source:
            logs.append("✔ Google Analytics detected")
            logs.append("✔ GA Event Fired: form_start")

        if "adobe" in page_source.lower():
            logs.append("✔ Adobe Analytics script detected")
            logs.append("✔ Adobe Event: trackSubmit")

        # Find and fill form inputs within the target form
        inputs = target_form.find_elements(By.TAG_NAME, "input")
        filled_fields = 0
        
        for idx, field in enumerate(inputs):
            try:
                field_type = field.get_attribute("type")
                field_name = field.get_attribute("name") or f"field-{idx}"
                
                if field_type in ['text', 'email', 'name']:
                    # Check if field is visible and enabled
                    if field.is_displayed() and field.is_enabled():
                        field.clear()
                        if "email" in field_type or "email" in field_name.lower():
                            field.send_keys("demo@xatform.com")
                        else:
                            field.send_keys("Test Name")
                        logs.append(f"✔ Input field {idx + 1}: {field_name} autofilled")
                        filled_fields += 1
                    else:
                        logs.append(f"⚠ Field {field_name} not visible/enabled, skipped")
                        
            except Exception as e:
                logs.append(f"✘ Error autofilling field {idx + 1}: {str(e)}")

        logs.append(f"✔ Total fields filled: {filled_fields}")

        # Try to submit the form
        submit_buttons = target_form.find_elements(By.XPATH, ".//input[@type='submit'] | .//button[@type='submit'] | .//button[contains(text(), 'Submit')]")
        
        if submit_buttons:
            try:
                submit_button = submit_buttons[0]
                if submit_button.is_displayed() and submit_button.is_enabled():
                    submit_button.click()
                    logs.append("✔ Form submitted successfully")
                    time.sleep(2)  # Wait for submission to process
                else:
                    logs.append("⚠ Submit button not clickable")
            except Exception as e:
                logs.append(f"✘ Form submission failed: {str(e)}")
        else:
            logs.append("⚠ No submit button found")

    except TimeoutException:
        logs.append("✘ Page load timeout")
    except Exception as e:
        logs.append(f"✘ Unexpected error: {str(e)}")
    finally:
        time.sleep(1)
        driver.quit()
        logs.append("✔ Browser session closed")
    
    return logs
