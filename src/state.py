from typing import List, Dict, Any, Optional
from typing_extensions import TypedDict

class JobListing(TypedDict):
    job_title: str
    job_description: str
    qualifications: str
    location: str
    application_process: str

class CompanyData(TypedDict):
    name: str
    ticker: Optional[str]
    financial_summary: Optional[str]
    financial_data: Optional[Dict[str, Any]]
    is_eligible: bool
    job_listings: List[JobListing]
    additional_info: Optional[str]
    career_page_url: Optional[str]

class AgentState(TypedDict):
    query: str
    companies: List[CompanyData]
    final_json: Dict[str, Any]
