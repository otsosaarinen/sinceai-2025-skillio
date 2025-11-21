from langchain_community.tools import DuckDuckGoSearchResults
from langchain_core.tools import tool

@tool
def search_companies(query: str) -> str:
    """
    Search for companies based on a query. 
    Useful for finding AI and Data companies in Finland.
    Returns search results which can be parsed to identify company names.
    """
    search = DuckDuckGoSearchResults()
    return search.run(query)

@tool
def find_ticker(company_name: str) -> str:
    """
    Search for the stock ticker symbol of a company.
    Useful for retrieving financial data.
    """
    search = DuckDuckGoSearchResults()
    return search.run(f"{company_name} stock ticker yahoo finance")

@tool
def find_career_page(company_name: str) -> str:
    """
    Search for the career or jobs page of a company.
    """
    search = DuckDuckGoSearchResults()
    return search.run(f"{company_name} careers jobs finland")
