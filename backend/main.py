from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os
import logging
import subprocess
from pathlib import Path
from dotenv import load_dotenv
import json
from datetime import datetime
import uvicorn
from sqlalchemy import func

# Load environment variables from .env file
load_dotenv()

# Configure logging for the server
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('FastAPIServer')

from startup_agents import ensure_crypto_artists_loaded
from agent_config import agent_registry

# Import the decentralized dataset manager
from decentralized_dataset import dataset_manager

# Import routers
from routes.decentralized_storage import router as dataset_router
from routes.chat import router as chat_router
from routes.agents import router as agents_router
from routes.studios import router as studios_router
from routes.tools import router as tools_router
from routes.artworks import router as artworks_router
from routes.vlayer_routes import router as vlayer_router

app = FastAPI(title="Memedici", version="2.0.0")

# Add CORS middleware for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(dataset_router)
app.include_router(chat_router)
app.include_router(agents_router)
app.include_router(studios_router)
app.include_router(tools_router)
app.include_router(artworks_router)
app.include_router(vlayer_router)

# Serve static files (for our HTML test interface)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
async def startup_event():
    """Startup event to ensure crypto artist agents are loaded and IPNS is configured."""
    logger.info("🚀 Starting Memedici server...")
    try:
        # Check and setup IPNS configuration if needed
        ipns_info = dataset_manager.get_ipns_info()
        
        if ipns_info["status"] == "not_configured":
            logger.info("🔧 IPNS not configured - running Lighthouse CLI setup...")
            
            # Check if setup script exists
            setup_script_path = Path("utils/setup_lighthouse_cli.sh")
            if setup_script_path.exists():
                try:
                    # Make script executable
                    subprocess.run(["chmod", "+x", str(setup_script_path)], check=True)
                    
                    # Run the setup script
                    result = subprocess.run(
                        ["bash", str(setup_script_path)], 
                        capture_output=True, 
                        text=True, 
                        timeout=300,  # 5 minute timeout
                        cwd=Path.cwd()
                    )
                    
                    if result.returncode == 0:
                        logger.info("✅ Lighthouse CLI setup completed successfully!")
                        # Reload dataset manager to pick up new IPNS config
                        dataset_manager._load_ipns_config()
                        updated_ipns_info = dataset_manager.get_ipns_info()
                        
                        if updated_ipns_info["status"] == "configured":
                            logger.info(f"🌐 IPNS configured: {updated_ipns_info['ipns_address']}")
                        else:
                            logger.warning("⚠️  IPNS setup completed but configuration not detected")
                    else:
                        logger.error(f"❌ Lighthouse CLI setup failed with return code {result.returncode}")
                except Exception as e:
                    logger.error(f"❌ Error during startup: {e}")
                    traceback.print_exc()

        # Load crypto artist agents
        ensure_crypto_artists_loaded()
        
        # Refresh the main agent registry to ensure it has the latest data
        agent_registry.reload_agents()
        
        logger.info(f"✅ Server startup complete - {len(agent_registry.list_agents())} agents loaded")
        
        # Log final IPNS status
        final_ipns_info = dataset_manager.get_ipns_info()
        if final_ipns_info["status"] == "configured":
            logger.info("🗂️  Decentralized storage fully operational with IPNS")
        else:
            logger.info("🗂️  Decentralized storage operating in basic mode (uploads only)")
            
    except Exception as e:
        logger.error(f"❌ Error during startup: {e}")
        import traceback
        traceback.print_exc()

@app.get("/")
async def root():
    """Root endpoint with API information for Memedici."""
    return {
        "platform": "Memedici",
        "version": "2.0.0",
        "description": "An AI-powered platform for creating artistic agents with evolving personas and creative content generation",
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for deployment monitoring."""
    return {
        "status": "healthy",
        "platform": "Memedici",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/test", response_class=HTMLResponse)
async def test_interface():
    """Serve the test HTML interface."""
    return FileResponse("static/test.html")

if __name__ == "__main__":
    import os
    
    # Get port from environment variable (Render provides this)
    port = int(os.environ.get("PORT", 8000))
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True, 
        log_level="info"
    ) 