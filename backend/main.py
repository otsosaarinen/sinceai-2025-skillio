import json
import re
import sys
import yfinance as yf
from typing import List, Dict, TypedDict, Optional
import operator
from dotenv import load_dotenv
import os
from langchain_ollama import ChatOllama
from langchain_community.tools.tavily_search import TavilySearchResults
from langgraph.graph import StateGraph, END
import pandas as pd
import requests

# --- CONFIGURATION ---
# os.environ["TAVILY_API_KEY"] = "tvly-..." # Ensure this is set
load_dotenv()
TAVILY_API_key = os.getenv("TAVILY_API_KEY")
LLM_MODEL = "llama3" # or "mistral"

# --- STATE DEFINITION ---
class CompanyInfo(TypedDict):
    name: str
    ticker: str
    website: str
    financial_summary: str  # Consolidated financial/news context
    job_data: List[Dict[str, str]]
    lead_score: int         # 0 to 100
    sales_argument: str     # "Why this company? Why now?"
    sources: List[str]

class AgentState(TypedDict):
    companies: List[CompanyInfo]
    status: str

# --- HELPERS ---
# Global logger callback
log_callback = None

def set_log_callback(callback):
    global log_callback
    log_callback = callback

def log(*args):
    message = " ".join(map(str, args))
    if log_callback:
        try:
            log_callback(message)
        except Exception:
            pass
    sys.stdout.write(message + "\n")

def extract_json_list(text):
    """Robustly extracts a JSON list from LLM output."""
    try:
        return json.loads(text)
    except:
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            try:
                clean_text = match.group(0).replace("'", '"')
                return json.loads(clean_text)
            except:
                pass
    return []

def collect_urls(search_results):
    """Extracts URLs from Tavily search results."""
    urls = []
    if isinstance(search_results, list):
        for item in search_results:
            if 'url' in item:
                urls.append(item['url'])
    return urls

def check_stock_growth(ticker_symbol):
    """Calculates public stock growth if available."""
    try:
        # clean_ticker = ticker_symbol.split(" ")[0].strip().replace(".", "-")
        stock = yf.Ticker(ticker_symbol)
        hist = stock.history(period="6mo") # 6 months is better for "Why Now"
        if hist.empty: return None
        start = hist.iloc[0]['Close']
        end = hist.iloc[-1]['Close']
        growth = ((end - start) / start) * 100
        return f"Stock: {growth:.2f}% (6mo change)"
    except:
        return None

def check_ollama_status():
    """Check if Ollama is running and the required model is available."""
    ollama_url = "http://localhost:11434/api/models"  # Default Ollama endpoint

    try:
        response = requests.get(ollama_url, timeout=5)
        response.raise_for_status()
        models = response.json()

        # Check if the required model is available
        required_model = LLM_MODEL
        if any(model.get("name") == required_model for model in models):
            log(f"Ollama is running and model '{required_model}' is available.")
            return True
        else:
            log(f"Ollama is running, but model '{required_model}' is not available.")
            return False
    except requests.exceptions.ConnectionError:
        log("Ollama is not running. Please start the Ollama server.")
        return False
    except Exception as e:
        log(f"Error checking Ollama status: {e}")
        return False

# Call the check at startup
if not check_ollama_status():
    sys.exit("Exiting: Ollama is not running or the required model is unavailable.")

# --- NODES ---

def discovery_node(state: AgentState):
    log("\n--- [1] Discovery: Finding Potential Leads ---")
    llm = ChatOllama(model=LLM_MODEL, temperature=0)
    search = TavilySearchResults(max_results=5)
    
    # Search for companies showing "Buying Signals" (Growth, Funding, Digital Transformation)
    queries = [
        "Finnish companies raising Series A or B funding 2024 2025 data",
        "Finland fast growing companies investing in AI and digital transformation",
        "Finnish startups hiring data engineers 2025"
    ]
    
    aggregated_results = ""
    for q in queries:
        res = search.invoke(q)
        aggregated_results += f"\nResults for '{q}': {res}\n"
    
    prompt = f"""
    Analyze these search results to identify companies in Finland that are investing in Data or AI.
    Focus on: Scale-ups, funded startups, or large corps expanding their digital teams.

    CONTEXT:
    We are generating leads for "SkillIO", a company that provides junior/mid-level Data/AI professionals to help companies build capacity.
    
    STRICT FILTERING CRITERIA:
    1. The company MUST be headquartered in Finland or be of Finnish origin.
    2. EXCLUDE US-based global corporations (e.g., Bain, Teradata, Google, Microsoft) unless the news is specifically about their Finnish subsidiary's independent growth.
    3. Prioritize Finnish startups and scale-ups.
    4. **SkillIO Fit**: Include companies that likely need "hands-on" execution power (juniors/mids).
       - Exclude companies that are purely looking for "Head of AI" or strategic leadership only.
       - Exclude direct competitors (other AI consultancies) if it's clear they don't hire external juniors.
    
    SEARCH DATA:
    {aggregated_results}
    
    Extract exactly company names.
    Return ONLY a JSON list of strings. Example: ["Company A", "Company B"]
    """
    
    response = llm.invoke(prompt)
    names = extract_json_list(response.content.strip())
    
    # Fallback for demo stability
    if not names:
        names = ["Kone", "Supermetrics", "Wolt", "Oura", "Nokia"]
        
    log(f"   Identified Candidates: {names}")
    
    companies_struct = []
    for name in names:
        companies_struct.append({
            "name": name,
            "ticker": "Check",
            "website": "Pending",
            "financial_summary": "Pending",
            "job_data": [],
            "lead_score": 0,
            "sales_argument": "Pending",
            "sources": []
        })
        
    return {"companies": companies_struct[:5]}  # Limit to first 5 for manageability

def financial_node(state: AgentState):
    log("\n--- [2] Financials: Assessing Budget & Growth ---")
    companies = state['companies']
    llm = ChatOllama(model=LLM_MODEL, temperature=0)
    search = TavilySearchResults(max_results=2)

    updated_companies = []
    csv_df = pd.read_csv("./finnish_companies.csv")
    for comp in companies:
        log(f"   Checking Financials: {comp['name']}")
        
        # 1. Ticker Check
        ticker_query = f"Stock ticker for {comp['name']} Finland. Is it public?"
        ticker_res = search.invoke(ticker_query)
        comp['sources'].extend(collect_urls(ticker_res))
        
        # LLM decides if public/private
        ticker_prompt = f"Is {comp['name']} public? Return ticker or 'PRIVATE'. Context: {ticker_res}"
        ticker = llm.invoke(ticker_prompt).content.strip().upper()
        
        fin_data = ""
        
        # if "PRIVATE" not in ticker and len(ticker) < 12:
        #     stock_data = check_stock_growth(ticker)
        #     if stock_data:
        #         fin_data += f"Public Market: {stock_data}. "
        # if "PRIVATE" not in ticker and len(ticker) < 12:
            # CSV-based ticker lookup
        company_name_lower = comp['name'].lower().strip()
        match = csv_df[csv_df['Company'].str.lower().str.strip().apply(lambda x: x in company_name_lower)]
        if not match.empty:
            ticker_csv = match.iloc[0]['Ticker']
            log(f"      Found Ticker in CSV: {ticker_csv}")
            comp['ticker'] = ticker_csv
            stock_data = check_stock_growth(ticker_csv)
            if stock_data:
                fin_data += f"Public Market: {stock_data}. "
        else:
            comp['ticker'] = None
            fin_data += "Ticker not found in CSV. "
        # 2. News/Funding Check (Crucial for "Why Now")
        news_query = f"{comp['name']} Finland revenue growth funding round investment 2024 2025"
        news_res = search.invoke(news_query)
        comp['sources'].extend(collect_urls(news_res))
        
        summary_prompt = f"""
        Context: {news_res}
        Summarize {comp['name']}'s recent financial situation in 1 sentence.
        Highlight: Investment rounds, acquisitions, or revenue growth.
        If bad news (layoffs), mention that.
        """
        news_summary = llm.invoke(summary_prompt).content.strip()
        
        comp['financial_summary'] = f"{fin_data} {news_summary}"

        # 3. Website Check
        site_query = f"{comp['name']} official website"
        site_res = search.invoke(site_query)
        comp['sources'].extend(collect_urls(site_res))
        
        site_prompt = f"Context: {site_res}\nExtract the official website URL for {comp['name']}. Return ONLY the URL."
        website = llm.invoke(site_prompt).content.strip()
        comp['website'] = website
        
        updated_companies.append(comp)
        
    return {"companies": updated_companies}

def recruitment_node(state: AgentState):
    log("\n--- [3] Recruitment: Scouting Talent Gaps ---")
    companies = state['companies']
    llm = ChatOllama(model=LLM_MODEL, temperature=0)
    search = TavilySearchResults(max_results=3)
    
    updated_companies = []
    
    for comp in companies:
        log(f"   Scouting Jobs: {comp['name']}")
        
        # Targeted search for Skillio's fit (Data/AI roles)
        query = f"site:*.fi {comp['name']} careers open positions data engineer analyst ai developer list"
        results = search.invoke(query)
        comp['sources'].extend(collect_urls(results))
        
        prompt = f"""
        Context from {comp['name']} career pages:
        {results}
        
        Extract a JSON list of open Data/AI roles.
        Format: [{{"title": "Role Name", "seniority": "Junior/Mid/Senior/Lead"}}]
        Infer seniority from the title.
        Return ONLY the JSON.
        """
        
        raw_resp = llm.invoke(prompt).content.strip()
        jobs = extract_json_list(raw_resp)
        
        if not jobs:
            # Fallback: Empty list implies no obvious open roles found online
            jobs = []
            
        comp['job_data'] = jobs
        updated_companies.append(comp)
        
    return {"companies": updated_companies}

def scoring_node(state: AgentState):
    """
    The 'Brain' of the operation.
    Evaluates fit for Skillio based on the 'Quality Lead' criteria.
    """
    log("\n--- [4] Scoring: Qualifying Leads for Skillio ---")
    companies = state['companies']
    llm = ChatOllama(model=LLM_MODEL, temperature=0)
    
    scored_companies = []
    
    for comp in companies:
        log(f"   Scoring: {comp['name']}...")
        
        # Prepare the context for the LLM Agent
        prompt = f"""
        You are the Sales Director for "Skillio".
        
        ABOUT SKILLIO:
        - We build Data/AI capacity for clients.
        - We provide technically trained, business-oriented JUNIORS and MID-LEVEL professionals.
        - We DO NOT provide high-level seniors/principals.
        - Ideal Client: A company investing in AI that needs "hands on deck" to execute, or has a training gap.
        
        COMPANY DATA:
        - Name: {comp['name']}
        - Financials/News: {comp['financial_summary']}
        - Open Jobs: {json.dumps(comp['job_data'])}
        
        TASK:
        1. Assign a "Lead Score" (0-100).
           - +20 pts: Recent funding or high growth.
           - +30 pts: Hiring multiple Data Engineers/Analysts (indicates volume need).
           - +10 pts: Junior/Trainee roles mentioned.
           - -50 pts: Layoffs or financial distress.
           - -20 pts: Only hiring "Principal" or "Head of AI" (we can't help them).
           - -20 pts: No open data roles found.
           
        2. Write a "Sales Argument" (2 sentences).
           - "Why this company?": Do they have a capacity gap?
           - "Why now?": Did they just get funding? Are they actively recruiting?
        
        OUTPUT FORMAT (JSON ONLY):
        {{
            "score": <int>,
            "sales_argument": "<string>"
        }}
        """
        
        try:
            response = llm.invoke(prompt).content.strip()
            # Clean up markdown if present
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "{" in response:
                response = "{" + response.split("{", 1)[1]
                response = response.rsplit("}", 1)[0] + "}"

            result = json.loads(response)
            comp['lead_score'] = result.get('score', 0)
            comp['sales_argument'] = result.get('sales_argument', "Analysis failed.")
            
        except Exception as e:
            log(f"   Scoring Error for {comp['name']}: {e}")
            comp['lead_score'] = 0
            comp['sales_argument'] = "Could not score due to data issues."
            
        scored_companies.append(comp)
    
    # SORTING LOGIC: Highest Priority First
    scored_companies.sort(key=lambda x: x['lead_score'], reverse=True)
    
    return {"companies": scored_companies}

def writer_node(state: AgentState):
    log("\n--- [5] Final Report ---")
    
    # Deduplicate sources
    for comp in state['companies']:
        comp['sources'] = list(set(comp['sources']))

    # Generate a unique filename based on the current timestamp
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"skillio_leads_{timestamp}.json"

    with open(filename, "w") as f:
        json.dump(state['companies'], f, indent=4)
    log(f"Leads saved to {filename} (Ordered by Priority)")
    return state

# --- GRAPH CONSTRUCTION ---
workflow = StateGraph(AgentState)
workflow.add_node("discovery", discovery_node)
workflow.add_node("financial", financial_node)
workflow.add_node("recruitment", recruitment_node)
workflow.add_node("scoring", scoring_node) # <--- The New Node
workflow.add_node("writer", writer_node)

workflow.set_entry_point("discovery")
workflow.add_edge("discovery", "financial")
workflow.add_edge("financial", "recruitment")
workflow.add_edge("recruitment", "scoring")
workflow.add_edge("scoring", "writer")
workflow.add_edge("writer", END)

app = workflow.compile()

if __name__ == "__main__":
    app.invoke({"companies": [], "status": "start"})