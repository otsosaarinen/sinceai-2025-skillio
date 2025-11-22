import json
import os
import re
from dotenv import load_dotenv
import yfinance as yf
from typing import List, Dict, TypedDict, Annotated
from langchain_ollama import ChatOllama
from langchain_community.tools.tavily_search import TavilySearchResults
from langgraph.graph import StateGraph, END

# --- CONFIGURATION ---
load_dotenv()  # Load environment variables from .env file
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
LLM_MODEL = "llama3" 

# --- STATE DEFINITION ---
class CompanyInfo(TypedDict):
    name: str
    ticker: str
    financial_growth: str
    job_description: List[Dict[str, str]] # Changed to a list of objects

class AgentState(TypedDict):
    companies: List[CompanyInfo]
    status: str

# --- HELPERS ---
def extract_json_list(text):
    """Robustly extracts a JSON list from LLM output."""
    try:
        return json.loads(text)
    except:
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0).replace("'", '"'))
            except:
                pass
    return []

def check_stock_growth(ticker_symbol):
    """Calculates public stock growth."""
    try:
        clean_ticker = ticker_symbol.split(" ")[0].strip().replace(".", "-")
        stock = yf.Ticker(clean_ticker)
        hist = stock.history(period="1y")
        if hist.empty: return None
        start = hist.iloc[0]['Close']
        end = hist.iloc[-1]['Close']
        growth = ((end - start) / start) * 100
        return f"{growth:.2f}% (1Y Public Market Change)"
    except:
        return None

# --- NODES ---

def discovery_node(state: AgentState):
    print("\n--- [1] Searching for Companies ---")
    llm = ChatOllama(model=LLM_MODEL, temperature=0)
    search = TavilySearchResults(max_results=5)
    
    print("   Querying Tavily for top AI companies...")
    # We add 'consulting' or 'product' to get better lists
    search_results = search.invoke("Top AI and Data companies in Finland 2024 2025 list")
    
    prompt = f"""
    Extract exactly 3-5 names of AI/Data companies in Finland from these results:
    {search_results}
    Return ONLY a JSON list of strings. No markdown.
    Example: ["Company A", "Company B"]
    """
    response = llm.invoke(prompt)
    names = extract_json_list(response.content.strip())
    
    # Fallback if LLM fails
    if not names:
        names = ["Silo AI", "Reaktor", "Nokia", "Supermetrics"]
        
    print(f"   Identified: {names}")
    
    companies_struct = []
    for name in names:
        companies_struct.append({
            "name": name,
            "ticker": "Checking...",
            "financial_growth": "Pending",
            "job_description": []
        })
        
    return {"companies": companies_struct}

def financial_node(state: AgentState):
    print("\n--- [2] Analyzing Financials (Public & Private) ---")
    companies = state['companies']
    llm = ChatOllama(model=LLM_MODEL, temperature=0)
    search = TavilySearchResults(max_results=2)

    updated_companies = []
    
    for comp in companies:
        print(f"   Analyzing: {comp['name']}")
        
        # Step A: Check if Public
        ticker_query = f"Stock ticker symbol for {comp['name']} Finland. Is it public?"
        ticker_search = search.invoke(ticker_query)
        
        prompt_ticker = f"""
        Context: {ticker_search}
        Is {comp['name']} a public company? 
        If YES, return the ticker (e.g. NOKIA). 
        If NO (Private), return 'PRIVATE'.
        Return ONLY the word 'PRIVATE' or the Ticker string.
        """
        ticker_result = llm.invoke(prompt_ticker).content.strip().upper()
        
        growth_info = "Data Not Available"
        
        # Step B: Branch Logic
        if "PRIVATE" not in ticker_result and len(ticker_result) < 10:
            # PUBLIC PATH
            comp['ticker'] = ticker_result
            print(f"      Found Ticker: {ticker_result}")
            calc = check_stock_growth(ticker_result)
            if calc:
                growth_info = calc
            else:
                growth_info = "Public data lookup failed."
        else:
            # PRIVATE PATH - Search for News/Revenue
            comp['ticker'] = "PRIVATE"
            print(f"      Private Company. Searching news...")
            
            # Search specifically for financial news
            news_query = f"{comp['name']} Finland financial results revenue growth 2024 2025 press release funding"
            news_results = search.invoke(news_query)
            
            # LLM Summarization
            prompt_news = f"""
            Analyze these search snippets about {comp['name']}:
            {news_results}
            
            Summarize their financial status in 1-2 sentences. 
            Look for: Revenue growth, Funding rounds (Series A/B), Acquisitions, or Profitability.
            If data is missing, say "No recent public financial data found."
            """
            growth_info = llm.invoke(prompt_news).content.strip()

        comp['financial_growth'] = growth_info
        updated_companies.append(comp)
        
    return {"companies": updated_companies}

def recruitment_node(state: AgentState):
    print("\n--- [3] Scouting Jobs (Site Search) ---")
    companies = state['companies']
    llm = ChatOllama(model=LLM_MODEL, temperature=0)
    
    # increased results to get better coverage of career pages
    search = TavilySearchResults(max_results=3) 
    
    updated_companies = []
    
    for comp in companies:
        print(f"   Scouting: {comp['name']}")
        
        # Query optimized to find the list directly
        query = f"site:*.fi {comp['name']} careers open positions list data engineer ai"
        results = search.invoke(query)
        
        prompt = f"""
        Context from {comp['name']} career pages:
        {results}
        
        Extract a list of open job roles.
        Format ONLY as a valid JSON list of objects with keys: "title" and "date".
        If the date is not explicitly visible in the snippet, write "Unknown".
        
        Example:
        [
            {{"title": "Senior Data Engineer", "date": "2024-05-10"}},
            {{"title": "AI Researcher", "date": "Unknown"}}
        ]
        
        Return ONLY the JSON.
        """
        
        raw_response = llm.invoke(prompt).content.strip()
        
        # Parse the LLM output
        jobs_list = extract_json_list(raw_response)
        
        # Fallback if list is empty/parsing failed
        if not jobs_list:
            jobs_list = [{"title": "Check Career Page (Extraction Failed)", "date": "N/A"}]
            
        comp['job_description'] = jobs_list
        updated_companies.append(comp)
        
    return {"companies": updated_companies}

def writer_node(state: AgentState):
    print("\n--- [4] Writing Report ---")
    filename = "finland_ai_report.json"
    with open(filename, "w") as f:
        json.dump(state['companies'], f, indent=4)
    print(f"Success! Data saved to {filename}")
    return state

# --- GRAPH CONSTRUCTION ---
workflow = StateGraph(AgentState)
workflow.add_node("discovery", discovery_node)
workflow.add_node("financial_analyst", financial_node)
workflow.add_node("recruiter", recruitment_node)
workflow.add_node("writer", writer_node)

workflow.set_entry_point("discovery")
workflow.add_edge("discovery", "financial_analyst")
workflow.add_edge("financial_analyst", "recruiter")
workflow.add_edge("recruiter", "writer")
workflow.add_edge("writer", END)

app = workflow.compile()

if __name__ == "__main__":
    app.invoke({"companies": [], "status": "start"})