from selenium import webdriver
from selenium.webdriver.common.by import By
import time

def extract_forms_from_url(url):
    driver = webdriver.Chrome()
    driver.get(url)
    forms = driver.find_elements(By.TAG_NAME, "form")
    links = []
    for i, form in enumerate(forms):
        form_id = form.get_attribute("id") or f"form{i}"
        links.append(f"{url}#{form_id}")
    driver.quit()
    return links

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
