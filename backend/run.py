import uvicorn
import os

if __name__ == "__main__":
    # Get port and host from environment or default to production-ready values
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    # Enable reload only in development mode to save CPU/memory resources in production
    is_dev = os.getenv("ENV", "development").lower() == "development"
    
    # Run the uvicorn server
    uvicorn.run("app.main:app", host=host, port=port, reload=is_dev)
