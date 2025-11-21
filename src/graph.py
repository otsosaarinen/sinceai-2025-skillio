import json
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage
from state import AgentState, CompanyData, JobListing
from tools.search import search_companies, find_ticker, find_career_page
from tools.financial import get_financial_data
from tools.scraper import scrape_website
from llm import get_llm

llm = get_llm()

def search_node(state: AgentState):
    query = state['query']
    print(f"Searching for: {query}")
    search_result = search_companies.invoke(query)
    
    # Use LLM to extract company names
    prompt = f"""
    Based on the following search results, identify a list of AI and Data companies in Finland.
    Return ONLY a JSON array of strings, e.g. ["Company A", "Company B"].
    
    Search Results:
    {search_result}
    """
    response = llm.invoke([HumanMessage(content=prompt)])
    try:
        # Clean up response to ensure it's just the list
        content = response.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        company_names = json.loads(content)
        companies = [{"name": name, "is_eligible": False, "job_listings": []} for name in company_names]
        return {"companies": companies}
    except Exception as e:
        print(f"Error parsing companies: {e}")
        return {"companies": []}

def financial_node(state: AgentState):
    companies = state['companies']
    updated_companies = []
    
    for company in companies:
        print(f"Analyzing financials for: {company['name']}")
        # Find ticker
        ticker_search = find_ticker.invoke(company['name'])
        # Simple heuristic or LLM to extract ticker from search result
        # For simplicity, let's ask LLM to extract the ticker
        prompt = f"""
        Identify the Yahoo Finance stock ticker for '{company['name']}' from these search results.
        Return ONLY the ticker symbol (e.g., 'NOK' or 'NOKIA.HE'). If not found, return 'NOT_FOUND'.
        
        Search Results:
        {ticker_search}
        """
        response = llm.invoke([HumanMessage(content=prompt)])
        ticker = response.content.strip().replace("'", "").replace('"', "")
        
        if ticker and ticker != 'NOT_FOUND':
            financial_data = get_financial_data.invoke(ticker)
            company['ticker'] = ticker
            company['financial_data'] = financial_data
            
            # Generate summary
            if "error" not in financial_data:
                company['financial_summary'] = financial_data.get('summary', 'No summary available')
            else:
                company['financial_summary'] = f"Error retrieving data: {financial_data['error']}"
        else:
            company['ticker'] = None
            company['financial_data'] = None
            company['financial_summary'] = "Ticker not found"
            
        updated_companies.append(company)
        
    return {"companies": updated_companies}

def evaluate_node(state: AgentState):
    companies = state['companies']
    updated_companies = []
    
    for company in companies:
        print(f"Evaluating eligibility for: {company['name']}")
        data = company.get('financial_data')
        is_eligible = False
        
        if data and "error" not in data:
            # Criteria: Positive revenue growth OR positive stock growth
            rev_growth = data.get('revenue_growth_yoy')
            stock_growth = data.get('stock_growth_1y')
            
            if (rev_growth is not None and rev_growth > 0) or \
               (stock_growth is not None and stock_growth > 0):
                is_eligible = True
        
        # For the sake of the exercise, if we can't find financial data (private companies),
        # we might want to skip or include them. The prompt says "Mark companies that show growth... as eligible".
        # So strict filtering.
        
        company['is_eligible'] = is_eligible
        updated_companies.append(company)
        
    return {"companies": updated_companies}

def scraping_node(state: AgentState):
    companies = state['companies']
    updated_companies = []
    
    for company in companies:
        if company['is_eligible']:
            print(f"Scraping jobs for: {company['name']}")
            # Find career page
            career_search = find_career_page.invoke(company['name'])
            
            # Extract URL using LLM
            prompt = f"""
            Find the URL for the career or jobs page of '{company['name']}' from these search results.
            Return ONLY the URL. If not found, return 'NOT_FOUND'.
            
            Search Results:
            {career_search}
            """
            response = llm.invoke([HumanMessage(content=prompt)])
            url = response.content.strip()
            
            if url and url != 'NOT_FOUND' and url.startswith('http'):
                company['career_page_url'] = url
                page_content = scrape_website.invoke(url)
                
                # Extract jobs using LLM
                extraction_prompt = f"""
                Extract job listings from the following text from {company['name']}'s career page.
                Return a JSON array of objects with keys: "job_title", "job_description", "qualifications", "location", "application_process".
                If no jobs are found, return [].
                
                Page Content:
                {page_content[:15000]} 
                """
                # Note: Truncating to avoid token limits, though 15k chars is usually fine for 128k context models
                
                job_response = llm.invoke([HumanMessage(content=extraction_prompt)])
                try:
                    content = job_response.content.strip()
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0]
                    elif "```" in content:
                        content = content.split("```")[1].split("```")[0]
                    
                    jobs = json.loads(content)
                    company['job_listings'] = jobs
                except Exception as e:
                    print(f"Error parsing jobs for {company['name']}: {e}")
                    company['job_listings'] = []
            else:
                company['career_page_url'] = None
                company['job_listings'] = []
        
        updated_companies.append(company)
        
    return {"companies": updated_companies}

def output_node(state: AgentState):
    companies = state['companies']
    final_output = {}
    
    for company in companies:
        # Only include if they were processed, or maybe all of them?
        # Prompt says: "Output Structured JSON... where each company is represented as a key"
        # It implies we should list the ones we found.
        
        final_output[company['name']] = {
            "financial_summary": company.get('financial_summary', "N/A"),
            "job_listings": company.get('job_listings', []),
            "additional_info": f"Ticker: {company.get('ticker')}, Eligible: {company.get('is_eligible')}"
        }
        
    return {"final_json": final_output}

# Build Graph
workflow = StateGraph(AgentState)

workflow.add_node("search", search_node)
workflow.add_node("financial", financial_node)
workflow.add_node("evaluate", evaluate_node)
workflow.add_node("scrape", scraping_node)
workflow.add_node("output", output_node)

workflow.set_entry_point("search")

workflow.add_edge("search", "financial")
workflow.add_edge("financial", "evaluate")
workflow.add_edge("evaluate", "scrape")
workflow.add_edge("scrape", "output")
workflow.add_edge("output", END)

app = workflow.compile()
