from fastapi import FastAPI, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import GenerateRequest, GenerateResponse, SqlDebugRequest, SqlDebugResponse
from app.agent import process_query_agent, process_debug_agent
from app.history_db import init_db, save_history_item, get_history_items, clear_history
from typing import List, Dict
import os

app = FastAPI(
    title="SQL Query Agent API",
    description="Agentic AI backend to convert natural language queries into verified SQL statements.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    """Initializes the SQLite database table on application start."""
    init_db()

PRELOADED_SCHEMAS = [
    {
        "id": "students",
        "name": "Students Grading",
        "description": "Information on student details, departments, and CGPA.",
        "schema": "students(id, name, age, department, cgpa)"
    },
    {
        "id": "products",
        "name": "E-commerce Store",
        "description": "Products inventory and order transaction records.",
        "schema": "products(id, name, price, stock, category)\norders(id, product_id, quantity, order_date, customer_name)"
    },
    {
        "id": "employees",
        "name": "Employee HR System",
        "description": "Corporate employee directories linked to departments.",
        "schema": "employees(id, name, position, salary, hire_date, department_id)\ndepartments(id, name, manager)"
    }
]

@app.get("/")
def read_root():
    return {"message": "SQL Query Agent API is running. Visit /docs for Swagger documentation."}

@app.get("/api/schemas", response_model=List[Dict[str, str]])
def get_preloaded_schemas():
    """
    Returns the list of pre-configured schema options.
    """
    return PRELOADED_SCHEMAS

@app.get("/api/config")
def get_config():
    """
    Returns the environment configuration status (whether API keys are present).
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    has_api_key = bool(gemini_key or openai_key)
    return {
        "mode": "ai" if has_api_key else "mock",
        "has_gemini_key": bool(gemini_key),
        "has_openai_key": bool(openai_key)
    }

@app.get("/api/history")
def read_history():
    """
    Retrieves all generated queries from the SQLite database.
    """
    try:
        return get_history_items()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch query history: {str(e)}"
        )

@app.delete("/api/history")
def delete_history():
    """
    Clears all query history from the SQLite database.
    """
    try:
        clear_history()
        return {"status": "success", "message": "Query history cleared successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear query history: {str(e)}"
        )

@app.post("/api/generate", response_model=GenerateResponse)
def generate_sql(payload: GenerateRequest):
    """
    Converts a natural language question into validated SQL query.
    """
    try:
        result = process_query_agent(
            question=payload.question,
            schema_text=payload.schema,
            dialect=payload.dialect,
            confirmed_dangerous=payload.confirmed_dangerous
        )
        
        # Automatically save successful generations to database history
        if result.get("status") == "success" and result.get("sql"):
            save_history_item(
                question=payload.question,
                sql_query=result.get("sql"),
                explanation=result.get("explanation", ""),
                dialect=payload.dialect,
                detected_language=result.get("detected_language", "English")
            )
            
        return GenerateResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred in SQL query agent: {str(e)}"
        )

@app.post("/api/debug", response_model=SqlDebugResponse)
def debug_sql(payload: SqlDebugRequest):
    """
    Analyzes, validates, and corrects a user-provided SQL query against schema constraints.
    """
    try:
        result = process_debug_agent(
            sql_query=payload.sql_query,
            instruction=payload.instruction,
            schema_text=payload.schema,
            dialect=payload.dialect
        )
        return SqlDebugResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred in SQL query debugger: {str(e)}"
        )

# Serve built frontend SPA static files if they exist in production
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
static_dir = os.path.join(backend_dir, "static")

if os.path.exists(static_dir):
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        
    @app.get("/{catchall:path}")
    async def serve_spa(catchall: str):
        if catchall.startswith("api/") or catchall.startswith("docs") or catchall.startswith("openapi.json"):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
            
        index_file = os.path.join(static_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend build directory exists, but index.html is missing."}

