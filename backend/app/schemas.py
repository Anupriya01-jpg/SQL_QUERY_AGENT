from pydantic import BaseModel, Field
from typing import Optional, List

class GenerateRequest(BaseModel):
    question: str = Field(..., description="The natural language question to convert to SQL")
    schema: str = Field(..., description="The schema details entered by the user (e.g. table definitions)")
    dialect: str = Field("sqlite", description="The SQL dialect to generate (sqlite or mysql)")
    confirmed_dangerous: bool = Field(False, description="Flag indicating if the user has explicitly confirmed running a query flagged as dangerous")

class GenerateResponse(BaseModel):
    status: str = Field(..., description="The status of the query generation: success, clarification_needed, dangerous_query, or error")
    detected_language: str = Field(..., description="Automatically detected language of the query")
    sql: Optional[str] = Field(None, description="The generated SQL query, if successful or dangerous")
    explanation: Optional[str] = Field(None, description="The simple English explanation of the generated SQL query")
    text: Optional[str] = Field(None, description="The natural language chatbot response if not query generation")
    follow_up_question: Optional[str] = Field(None, description="The follow-up question if clarification or missing data is detected")
    warning_message: Optional[str] = Field(None, description="A warning message if a dangerous query was flagged")
    steps: List[str] = Field(default=[], description="The step-by-step logs of the agent workflow")
    error: Optional[str] = Field(None, description="The error message if generation failed")

class HistoryItemCreate(BaseModel):
    question: str = Field(..., description="The question asked by the user")
    sql: str = Field(..., description="The generated SQL query")
    explanation: Optional[str] = Field(None, description="The simple English explanation of the SQL query")
    dialect: str = Field(..., description="The SQL dialect")
    detected_language: str = Field(..., description="The detected language of the query")

class DebugValidateRequest(BaseModel):
    schema_text: str = Field(..., description="The database schema definition")
    query: str = Field(..., description="The SQL query to parse and validate")

class DebugValidateResponse(BaseModel):
    valid: bool
    error: Optional[str] = None
    tables_identified: List[str] = []
    columns_identified: List[str] = []

class DebugFixRequest(BaseModel):
    schema_text: str = Field(..., description="The database schema definition")
    query: str = Field(..., description="The SQL query that failed validation")
    error: str = Field(..., description="The compiler operational error message")
    dialect: str = Field("sqlite", description="Target SQL dialect")

class DebugFixResponse(BaseModel):
    status: str
    fixed_sql: Optional[str] = None
    explanation: Optional[str] = None
    error: Optional[str] = None

class SqlDebugRequest(BaseModel):
    sql_query: str = Field(..., description="The user's original SQL query to debug")
    instruction: str = Field(..., description="Natural language description of what the query is supposed to do")
    schema: str = Field(..., description="The schema scope/table structures")
    dialect: str = Field("sqlite", description="Target SQL dialect")

class SqlDebugResponse(BaseModel):
    status: str = Field(..., description="success (no bugs), corrected (bugs fixed), or error")
    is_valid: bool = Field(..., description="Whether the original SQL query was already valid and correct")
    bugs_found: List[str] = Field(default=[], description="List of problems found in the original query")
    corrected_sql: Optional[str] = Field(None, description="The corrected SQL query if bugs were found")
    explanation: Optional[str] = Field(None, description="Explanation of why corrections were made or how the query works")
    steps: List[str] = Field(default=[], description="Agentic debugging reasoning logs")
    error: Optional[str] = Field(None, description="Error message if debugging failed")



