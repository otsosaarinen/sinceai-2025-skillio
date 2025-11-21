from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
import os

def get_llm():
    # Fallback to OpenAI if API key is present, otherwise Ollama
    if os.getenv("OPENAI_API_KEY"):
        return ChatOpenAI(model="gpt-4o")
    return ChatOllama(model="llama3.2:3b")
