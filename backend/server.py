from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import main
import asyncio
import json
import sys
import os

# Ensure we can import main if running from parent dir, though we'll run from backend/
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Error sending to websocket: {e}")

manager = ConnectionManager()

# Global variable to store the event loop
main_event_loop = None

@app.on_event("startup")
async def startup_event():
    global main_event_loop
    main_event_loop = asyncio.get_running_loop()

@app.websocket("/")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

def log_to_ws(message):
    # This is called from the synchronous graph execution.
    # We need to schedule the broadcast on the event loop.
    try:
        if main_event_loop and main_event_loop.is_running():
            asyncio.run_coroutine_threadsafe(manager.broadcast(message), main_event_loop)
    except Exception as e:
        print(f"Error logging to WS: {e}")

# Set the callback in main
main.set_log_callback(log_to_ws)

@app.get("/")
async def run_graph():
    print("Received request to run graph")
    # Run the graph in a threadpool to avoid blocking the event loop
    try:
        # We need to run the synchronous invoke method in a thread
        result = await asyncio.to_thread(main.app.invoke, {"companies": [], "status": "start"})
        
        # The result contains 'companies' which is what the frontend expects
        companies = result.get("companies", [])
        
        # Send final JSON via WebSocket as well (optional, but good for "done" state)
        # await manager.broadcast(json.dumps(companies)) 
        # Actually frontend expects it in HTTP response
        
        return companies
    except Exception as e:
        print(f"Error running graph: {e}")
        await manager.broadcast(f"Error: {str(e)}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4000)
