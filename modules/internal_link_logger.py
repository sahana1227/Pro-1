import json
import os
from datetime import datetime
import csv

class InternalLinkLogger:
    def __init__(self, log_dir="logs"):
        self.log_dir = log_dir
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
    
    def log_links(self, url, internal_links):
        """Log internal links to files"""
        try:
            print(f"📝 Logging {len(internal_links)} internal links...")
            
            # Create filename based on domain and timestamp
            domain = url.replace('https://', '').replace('http://', '').replace('/', '_')
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            # Log as JSON
            json_filename = f"{self.log_dir}/{domain}_{timestamp}_links.json"
            self._log_as_json(json_filename, url, internal_links)
            
            # Log as CSV
            csv_filename = f"{self.log_dir}/{domain}_{timestamp}_links.csv"
            self._log_as_csv(csv_filename, url, internal_links)
            
            print(f"✅ Links logged to {json_filename} and {csv_filename}")
            
            return {
                'json_file': json_filename,
                'csv_file': csv_filename,
                'links_logged': len(internal_links)
            }
            
        except Exception as e:
            print(f"❌ Failed to log links: {e}")
            return {'error': str(e)}
    
    def _log_as_json(self, filename, url, links):
        """Log links as JSON"""
        data = {
            'source_url': url,
            'timestamp': datetime.now().isoformat(),
            'total_links': len(links),
            'internal_links': links
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def _log_as_csv(self, filename, url, links):
        """Log links as CSV"""
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['URL', 'Link Text', 'Title'])
            
            for link in links:
                writer.writerow([
                    link.get('url', ''),
                    link.get('text', ''),
                    link.get('title', '')
                ])
