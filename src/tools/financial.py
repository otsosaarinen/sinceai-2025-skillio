import yfinance as yf
from langchain_core.tools import tool
from typing import Dict, Any

@tool
def get_financial_data(ticker: str) -> Dict[str, Any]:
    """
    Retrieve financial data for a given company ticker using Yahoo Finance.
    Returns a dictionary with key financial indicators like revenue, profit margins, and stock history.
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        # Get historical data for trend analysis (last 1 year)
        history = stock.history(period="1y")
        
        # Calculate stock trend (simple start vs end)
        if not history.empty:
            start_price = history.iloc[0]['Close']
            end_price = history.iloc[-1]['Close']
            stock_growth = ((end_price - start_price) / start_price) * 100
        else:
            stock_growth = 0

        financials = stock.financials
        if not financials.empty and 'Total Revenue' in financials.index:
            # Calculate revenue growth (current year vs previous year)
            # financials columns are usually dates, sorted descending (newest first)
            revenues = financials.loc['Total Revenue']
            if len(revenues) >= 2:
                current_rev = revenues.iloc[0]
                prev_rev = revenues.iloc[1]
                revenue_growth = ((current_rev - prev_rev) / prev_rev) * 100
            else:
                revenue_growth = None
        else:
            revenue_growth = None

        data = {
            "ticker": ticker,
            "name": info.get("longName", ticker),
            "industry": info.get("industry", "Unknown"),
            "revenue_growth_yoy": revenue_growth,
            "stock_growth_1y": stock_growth,
            "profit_margins": info.get("profitMargins"),
            "earnings_per_share": info.get("trailingEps"),
            "revenue": info.get("totalRevenue"),
            "gross_profits": info.get("grossProfits"), # Note: might not be available for all
            "summary": f"Stock Growth (1y): {stock_growth:.2f}%, Revenue Growth (YoY): {revenue_growth if revenue_growth is not None else 'N/A'}%"
        }
        return data
    except Exception as e:
        return {"error": str(e)}
