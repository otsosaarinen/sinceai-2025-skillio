import os
import json
import sys
from dotenv import load_dotenv
from graph import app

# Add project root directory to Python path
sys.path.append("/Users/rohanjai/Developer/SkillIO")

# Load environment variables
load_dotenv()

def main():
    print("Starting SkillIO Application...")
    
    # Check for API keys
    if not os.getenv("OPENAI_API_KEY"):
        print("Warning: OPENAI_API_KEY not found. Ensure you have Ollama running if using local LLM.")

    initial_state = {
        "query": "AI and Data companies in Finland",
        "companies": [],
        "final_json": {}
    }
    
    print("Running workflow...")
    result = app.invoke(initial_state)
    
    final_json = result.get("final_json", {})
    
    # Output to file
    with open("company_analysis.json", "w") as f:
        json.dump(final_json, f, indent=2)
        
    print("Analysis complete. Results saved to company_analysis.json")
    print(json.dumps(final_json, indent=2))

if __name__ == "__main__":
    main()
