import requests
from bs4 import BeautifulSoup
import html2text
from langchain_core.tools import tool

@tool
def scrape_website(url: str) -> str:
    """
    Scrape the content of a website and return it as text.
    Useful for reading career pages to find job listings.
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
            
        h = html2text.HTML2Text()
        h.ignore_links = False
        text = h.handle(str(soup))
        
        # Truncate if too long (LLM context limits) - simplistic approach
        return text[:10000] 
    except Exception as e:
        return f"Error scraping {url}: {str(e)}"
