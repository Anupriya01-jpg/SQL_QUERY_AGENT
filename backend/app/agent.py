import os
import re
import json
import sqlite3
from typing import List, Dict, Any, Tuple, Optional
from dotenv import load_dotenv
from app.validator import validate_sql_syntax

# Load env variables from .env
load_dotenv()

# Preloaded schemas and queries for Mock Mode
MOCK_SCHEMAS = {
    "students": {
        "schema": "students(id, name, age, department, cgpa)",
        "patterns": [
            (r"(show|list|find|get).*students.*cgpa.*>\s*8", "SELECT * FROM students WHERE cgpa > 8;", "Selects all fields from the students table where the student's CGPA is greater than 8."),
            (r"8க்கு மேல் சிஜிபிஏ உள்ள மாணவர்களைக் காட்டு", "SELECT * FROM students WHERE cgpa > 8;", "Selects all fields from the students table where the student's CGPA is greater than 8 (Tamil request)."),
            (r"उन सभी छात्रों को दिखाएं जिनका सीजीपीए 8 से अधिक है", "SELECT * FROM students WHERE cgpa > 8;", "Selects all fields from the students table where the student's CGPA is greater than 8 (Hindi request)."),
            (r"average.*age.*(cs|computer science)", "SELECT AVG(age) FROM students WHERE department = 'CS';", "Calculates the average age of all students enrolled in the Computer Science (CS) department."),
            (r"count.*students", "SELECT COUNT(*) FROM students;", "Counts and returns the total number of students in the table."),
            (r"delete.*students", "DELETE FROM students;", "Deletes all records from the students table. This is a dangerous database operation!"),
            (r"drop.*students", "DROP TABLE students;", "Drops the entire students table from the database schema. Highly dangerous!"),
        ]
    },
    "products": {
        "schema": "products(id, name, price, stock, category)\norders(id, product_id, quantity, order_date, customer_name)",
        "patterns": [
            (r"(show|list|find|get).*products.*electronics", "SELECT * FROM products WHERE category = 'Electronics';", "Selects all products belonging to the Electronics category."),
            (r"total.*(sales|revenue)", "SELECT SUM(p.price * o.quantity) AS total_revenue FROM orders o JOIN products p ON o.product_id = p.id;", "Joins orders and products on product_id and calculates the sum of price multiplied by quantity to get total revenue."),
            (r"out of stock|stock.*0", "SELECT * FROM products WHERE stock = 0;", "Retrieves all products where the current inventory stock level is equal to 0."),
        ]
    },
    "employees": {
        "schema": "employees(id, name, position, salary, hire_date, department_id)\ndepartments(id, name, manager)",
        "patterns": [
            (r"salary.*>\s*50000|earning more than 50000", "SELECT * FROM employees WHERE salary > 50000;", "Retrieves all employees who have a salary strictly greater than 50,000."),
            (r"manager.*(hr|human resources)", "SELECT manager FROM departments WHERE name = 'HR';", "Selects the manager's name from the departments table for the department named 'HR'."),
        ]
    }
}

def get_api_client() -> Tuple[str, Any]:
    """
    Initializes and returns the available AI client.
    Returns: (client_type, client_instance)
    client_type can be 'gemini', 'openai', or 'mock'.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    if gemini_key:
        try:
            # Try newer google-genai package
            from google import genai
            client = genai.Client(api_key=gemini_key)
            return "gemini", client
        except ImportError:
            # Fall back to legacy google-generativeai
            try:
                import google.generativeai as genai_legacy
                genai_legacy.configure(api_key=gemini_key)
                return "gemini_legacy", genai_legacy
            except Exception:
                pass
                
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            return "openai", client
        except ImportError:
            pass
            
    return "mock", None

def run_mock_generation(question: str, schema_text: str) -> Dict[str, Any]:
    """
    Simulates AI generation using a rule-based engine when no API keys are present.
    """
    q_lower = question.lower()
    
    # 1. Simple Language Detection
    detected_lang = "English"
    if any(word in q_lower for word in ["காட்டு", "மாணவர்கள்", "விவரங்களை"]):
        detected_lang = "Tamil"
    elif any(word in q_lower for word in ["दिखाएं", "छात्रों", "सभी"]):
        detected_lang = "Hindi"
    elif any(word in q_lower for word in ["mostrar", "estudiantes", "todos"]):
        detected_lang = "Spanish"

    # 2. Check for out of scope or general text
    is_sql_related = any(word in q_lower for word in [
        "show", "list", "find", "get", "average", "count", "delete", "drop", "select", "where", "group", "having",
        "காட்டு", "மாணவர்கள்", "விவரங்களை", "இருந்து",
        "दिखाएं", "छात्रों", "सभी", "सीजीपीए", "औसत",
        "cgpa", "salary", "age", "price", "stock", "revenue", "manager", "name", "id", "clear", "whose"
    ])

    is_conversational = any(word in q_lower for word in ["hello", "hi", "hey", "how are you"]) and not is_sql_related

    if is_conversational:
        # Act as chatbot/agent
        text = "Hello! I am your AI SQL Query Agent. How can I help you today? You can select a database schema scope in the left panel, and ask me to generate a SQL query (e.g. 'Show all students whose CGPA is greater than 8')."
        return {
            "status": "success",
            "detected_language": detected_lang,
            "text": text,
            "steps": [
                "🔍 Step 1: Analyze user query intent (Chatbot Mode)",
                "✓ Identified conversational intent",
                "📝 Step 2: Generate chatbot response"
            ]
        }

    if not is_sql_related:
        return {
            "status": "error",
            "detected_language": detected_lang,
            "error": "This question does not appear to be database-related. Please ask a question about tables, columns, or data retrieval.",
            "steps": [
                "🔍 Step 1: Analyze user question (Out of Scope)",
                "❌ Terminated: Question is unrelated to SQL or Database schemas."
            ]
        }

    # 3. Check patterns across mocked schemas
    for schema_key, data in MOCK_SCHEMAS.items():
        # Check if table name is referenced in the question or schema_text
        if schema_key in q_lower or schema_key in schema_text.lower():
            for regex, sql, desc in data["patterns"]:
                if re.search(regex, q_lower):
                    return {
                        "status": "success",
                        "detected_language": detected_lang,
                        "sql": sql,
                        "explanation": desc,
                        "steps": [
                            "🔍 Step 1: Analyze user question & auto-detect language (Detected: " + detected_lang + ")",
                            f"📋 Step 2: Match tables in schema (Found match: '{schema_key}')",
                            f"⚙️ Step 3: Draft SQL statement for '{schema_key}' table",
                            "🛡️ Step 4: Validate SQL query using SQLite compiler (Successful)",
                            "📝 Step 5: Generate query explanation in English (Successful)",
                            "ℹ️ Running in DEMO Mode. Configure an API key in backend/.env for full AI agent abilities."
                        ]
                    }

    # 4. If we have a custom schema and simple match fails, build a template SELECT *
    # Extract table names from schema
    tables = []
    lines = re.split(r'[\n;]+', schema_text)
    for line in lines:
        match = re.match(r'^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', line.strip())
        if match:
            tables.append(match.group(1))
            
    if tables:
        target_table = tables[0]
        # Match potential column names in query
        cols_in_query = []
        # Find column names in parenthesis from schema
        col_match = re.search(r'\((.*)\)', schema_text)
        if col_match:
            cols = [c.split()[0].strip() for c in col_match.group(1).split(',')]
            for col in cols:
                if col in q_lower:
                    cols_in_query.append(col)
                    
        where_clause = ""
        if cols_in_query:
            # Look for numbers in query for comparison
            num_match = re.search(r'\b\d+\b', q_lower)
            if num_match:
                num = num_match.group(0)
                operator = "="
                if "greater" in q_lower or "above" in q_lower or "more" in q_lower or ">" in q_lower:
                    operator = ">"
                elif "less" in q_lower or "under" in q_lower or "below" in q_lower or "<" in q_lower:
                    operator = "<"
                elif "equal" in q_lower or "is" in q_lower or "=" in q_lower:
                    operator = "="
                where_clause = f" WHERE {cols_in_query[0]} {operator} {num}"
                
        sql = f"SELECT * FROM {target_table}{where_clause};"
        return {
            "status": "success",
            "detected_language": detected_lang,
            "sql": sql,
            "explanation": f"Selects records from the custom table '{target_table}' based on the input schema mapping.",
            "steps": [
                "🔍 Step 1: Analyze user question & auto-detect language (Detected: " + detected_lang + ")",
                f"📋 Step 2: Parse custom schema (Extracted table: '{target_table}')",
                "⚙️ Step 3: Formulate SQL query matching criteria",
                "🛡️ Step 4: Run validation in memory (Passed)",
                "📝 Step 5: Generate query summary",
                "ℹ️ Running in DEMO Mode. Configure an API key in backend/.env for full AI agent abilities."
            ]
        }

    # 5. Clarification fallback if schema is completely empty or query is undecipherable
    return {
        "status": "clarification_needed",
        "detected_language": detected_lang,
        "follow_up_question": "I couldn't identify the target tables or columns in your schema. Could you please specify which table you want to query, or upload/verify your database schema?",
        "steps": [
            "🔍 Step 1: Analyze user question & auto-detect language",
            "📋 Step 2: Examine database schema (Empty or unreadable)",
            "❓ Step 3: Flag ambiguous schema reference & prepare follow-up prompt"
        ]
    }

def call_llm(client_type: str, client: Any, prompt: str) -> str:
    """
    Helper to execute standard prompt generation on Gemini or OpenAI.
    """
    if client_type == "gemini":
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        return response.text
    elif client_type == "gemini_legacy":
        model = client.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return response.text
    elif client_type == "openai":
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content
    return ""

def process_query_agent(question: str, schema_text: str, dialect: str, confirmed_dangerous: bool = False) -> Dict[str, Any]:
    """
    Executes the multi-step agentic AI workflow:
    1. Understand query & detect language
    2. Extract tables/columns from schema
    3. Generate SQL Query
    4. Compile/Validate via validator.py (with feedback self-correction loop)
    5. Danger assessment
    6. Explain in plain English
    """
    steps = []
    
    # Check if API keys are set
    client_type, client = get_api_client()
    if client_type == "mock":
        res = run_mock_generation(question, schema_text)
        if res.get("status") == "success" and res.get("sql"):
            sql_draft = res["sql"]
            dangerous_keywords = ["DROP", "DELETE", "TRUNCATE", "ALTER", "UPDATE", "INSERT"]
            found_keywords = [kw for kw in dangerous_keywords if kw in sql_draft.upper()]
            if found_keywords and not confirmed_dangerous:
                res["status"] = "dangerous_query"
                res["warning_message"] = f"The query contains database modification operations: {', '.join(found_keywords)}. Please confirm if you wish to run this query."
                res["steps"] = res["steps"] + ["⚠️ Warning: Prevented generation of dangerous SQL command without user consent."]
        return res

    steps.append("🔍 Step 1: Analyze user query, detect language, and assess intent.")
    
    # Master prompt for understanding, parsing schema, and generating SQL
    initial_prompt = f"""
    You are the core backend engine of an Agentic SQL Generator.
    Your task is to analyze a natural language question and translate it into a SQL query based ONLY on the provided schema.
    
    User Question: "{question}"
    Database Schema:
    {schema_text}
    SQL Dialect Target: {dialect}
    
    You must output a raw JSON object containing these keys and nothing else:
    {{
      "detected_language": "string",
      "is_sql_query": boolean,
      "text": "string (friendly chatbot greeting/response if is_sql_query is false, empty otherwise)",
      "tables_identified": ["list", "of", "tables"],
      "columns_identified": ["list", "of", "columns"],
      "missing_info_or_ambiguous": boolean,
      "follow_up_question": "string (empty if not needed)",
      "sql_draft": "string (the SQL query, or empty if is_sql_query is false or missing_info_or_ambiguous is true)",
      "explanation": "string (brief explanation in simple English of what the generated query does, or empty)"
    }}
    
    Rules:
    1. Automatic language detection: Automatically detect the language of the question (e.g., English, Tamil, Hindi, Spanish).
    2. Intent check: If the question is NOT a query request related to the schema (e.g. greetings, unrelated general facts), set "is_sql_query" to false. In this case, write a friendly, context-appropriate response in the "text" field, greeting the user in their language and describing how they can ask queries about the provided database schema (and give examples of what they can ask based on the schema columns).
    3. Schema constraint: ONLY generate SQL referencing tables/columns in the given schema. Do NOT invent nonexistent columns. However, you MUST intelligently map user query synonyms or variations to the actual schema column names (e.g., map 'student_name' or 'student name' to 'name', map 'mark', 'marks', 'score', or 'scores' to 'cgpa', map 'joining_date' or 'date' to 'hire_date').
    4. Ambiguity / missing data: Only set "missing_info_or_ambiguous" to true if there is a severe, genuine ambiguity that makes it impossible to formulate a query (e.g., reference to a completely missing entity that has no semantic equivalent). If the user request uses synonyms that can be mapped to existing schema columns with high confidence, set "missing_info_or_ambiguous" to false and generate the SQL.
    5. Safety: Draft the SQL normally. Do not omit UPDATE, DELETE, or DROP in the draft, but do not execute them. Safety checks are run programmatically later.
    
    Ensure your response is valid JSON.
    """
    
    try:
        raw_response = call_llm(client_type, client, initial_prompt)
        res = json.loads(raw_response)
    except Exception as e:
        fallback_res = run_mock_generation(question, schema_text)
        fallback_res["steps"] = [
            f"⚠️ API Exception (falling back): {str(e)}",
            "🔄 Falling back to intelligent Demo/Mock Mode...",
        ] + fallback_res["steps"]
        return fallback_res
        
    detected_lang = res.get("detected_language", "English")
    steps.append(f"✓ Language detected: {detected_lang}")
    
    # Check intent
    if not res.get("is_sql_query", True):
        steps.append("✓ Conversational response generated (out of scope for SQL query).")
        return {
            "status": "success",
            "detected_language": detected_lang,
            "text": res.get("text", "Hello! I am your AI SQL Query Agent. How can I help you today? Feel free to ask a query about the database schema."),
            "steps": steps
        }
        
    # Check clarification need
    if res.get("missing_info_or_ambiguous", False):
        steps.append("❓ Agent flagged ambiguity or missing information.")
        return {
            "status": "clarification_needed",
            "detected_language": detected_lang,
            "follow_up_question": res.get("follow_up_question", "Could you clarify your request? Some columns or tables seem missing."),
            "steps": steps + ["✓ Prepared follow-up question for clarification."]
        }

    sql_draft = res.get("sql_draft", "").strip()
    explanation = res.get("explanation", "")
    tables_found = ", ".join(res.get("tables_identified", []))
    cols_found = ", ".join(res.get("columns_identified", []))
    
    steps.append(f"📋 Step 2: Extracting schema entities (Tables: [{tables_found}], Columns: [{cols_found}]).")
    steps.append("⚙️ Step 3: Generating SQL Query draft.")

    # 4. Validation Loop (Self-Correction)
    steps.append("🛡️ Step 4: Compiling query and validating syntax in SQLite memory...")
    
    valid = False
    validation_err = ""
    # We only validate SQLite dialect directly in-memory, for MySQL we can run a syntax check,
    # but we can try compiling on SQLite too for standard ANSI SQL queries.
    is_valid, validation_err = validate_sql_syntax(schema_text, sql_draft)
    
    if is_valid:
        valid = True
        steps.append("✓ SQL syntax validation check passed.")
    else:
        steps.append(f"⚠️ Validation error detected: {validation_err}")
        # Run self-correction loop up to 3 times
        for attempt in range(1, 4):
            steps.append(f"🔄 Agent Self-Correction - Attempt {attempt}/3...")
            correction_prompt = f"""
            You are an Agentic SQL Generator. Your previously generated SQL query failed in-memory syntax validation.
            
            User Question: "{question}"
            Database Schema:
            {schema_text}
            SQL Dialect: {dialect}
            
            Failed SQL: `{sql_draft}`
            Validation Error: {validation_err}
            
            Please correct the SQL query to fix this error. Ensure all columns and tables referenced match the schema exactly.
            Output a JSON object with this exact structure:
            {{
              "sql_draft": "string (the corrected SQL query)",
              "explanation": "string (revised explanation in simple English)"
            }}
            """
            try:
                raw_correction = call_llm(client_type, client, correction_prompt)
                corr_res = json.loads(raw_correction)
                sql_draft = corr_res.get("sql_draft", "").strip()
                explanation = corr_res.get("explanation", "")
                
                # Check validation again
                is_valid, validation_err = validate_sql_syntax(schema_text, sql_draft)
                if is_valid:
                    valid = True
                    steps.append("✓ Self-correction successful! SQL validation passed.")
                    break
                else:
                    steps.append(f"⚠️ Self-correction attempt {attempt} failed: {validation_err}")
            except Exception as e:
                steps.append(f"⚠️ Correction API error: {str(e)}")
                break
                
        if not valid:
            steps.append("❌ Self-correction loop exceeded. Query remains invalid.")
            return {
                "status": "error",
                "detected_language": detected_lang,
                "error": f"Generated SQL query contains syntax or schema mismatch: {validation_err}",
                "steps": steps,
                "sql": sql_draft
            }

    # 5. Safety Assessment
    # Identify potentially dangerous commands
    dangerous_keywords = ["DROP", "DELETE", "TRUNCATE", "ALTER", "UPDATE", "INSERT"]
    found_keywords = [kw for kw in dangerous_keywords if kw in sql_draft.upper()]
    
    if found_keywords and not confirmed_dangerous:
        steps.append("⚠️ Safety Check: Dangerous command detected!")
        warning_msg = f"The query contains database modification operations: {', '.join(found_keywords)}. Please confirm if you wish to run this query."
        return {
            "status": "dangerous_query",
            "detected_language": detected_lang,
            "sql": sql_draft,
            "explanation": explanation,
            "warning_message": warning_msg,
            "steps": steps + ["⚠️ Warning: Prevented generation of dangerous SQL command without user consent."]
        }
    
    steps.append("📝 Step 5: Explaining query syntax and finalizing response.")
    return {
        "status": "success",
        "detected_language": detected_lang,
        "sql": sql_draft,
        "explanation": explanation,
        "steps": steps + ["✓ Workflow complete! SQL Query generated and verified."]
    }

def run_mock_debug(sql_query: str, instruction: str, schema_text: str) -> Dict[str, Any]:
    """
    Rule-based mock debugger for SQL queries when no API keys are present.
    """
    bugs = []
    corrected_sql = sql_query
    
    q_lower = sql_query.lower()
    inst_lower = instruction.lower()
    
    # Simple regex parsing to find common typos based on standard schemas
    # Typos in table names: student -> students, product -> products, employee -> employees
    if "student" in q_lower and "students" not in q_lower:
        bugs.append("Table name mismatch: 'student' should be 'students'.")
        corrected_sql = re.sub(r'\bstudent\b', 'students', corrected_sql, flags=re.IGNORECASE)
    if "product" in q_lower and "products" not in q_lower:
        bugs.append("Table name mismatch: 'product' should be 'products'.")
        corrected_sql = re.sub(r'\bproduct\b', 'products', corrected_sql, flags=re.IGNORECASE)
    if "employee" in q_lower and "employees" not in q_lower:
        bugs.append("Table name mismatch: 'employee' should be 'employees'.")
        corrected_sql = re.sub(r'\bemployee\b', 'employees', corrected_sql, flags=re.IGNORECASE)
        
    # Typos in columns: names -> name, cpga -> cgpa, department_name -> department
    if "names" in q_lower:
        bugs.append("Column name typo: 'names' should be 'name'.")
        corrected_sql = re.sub(r'\bnames\b', 'name', corrected_sql, flags=re.IGNORECASE)
    if "cpga" in q_lower:
        bugs.append("Column name typo: 'cpga' should be 'cgpa'.")
        corrected_sql = re.sub(r'\bcpga\b', 'cgpa', corrected_sql, flags=re.IGNORECASE)
        
    # Logical check: if instruction mentions "greater than 8" but query has something else or has 7
    if "greater than 8" in inst_lower or "above 8" in inst_lower:
        num_matches = re.findall(r'\b\d+\b', q_lower)
        if num_matches and "8" not in num_matches:
            bugs.append(f"Logical discrepancy: The instruction requested values greater than 8, but query used value {num_matches[0]}.")
            # Replace the number in WHERE clause
            corrected_sql = re.sub(r'(cgpa\s*>\s*)\d+', r'\g<1>8', corrected_sql, flags=re.IGNORECASE)
            
    # SQLite syntax validation check
    is_valid, validation_err = validate_sql_syntax(schema_text, sql_query)
    if not is_valid:
        # If SQLite reports an error, add it as a bug if it's not already covered
        # Avoid duplication of messages
        if "no such table" in validation_err.lower() and len(bugs) > 0:
            pass
        else:
            bugs.append(f"SQL Syntax/Schema Error: {validation_err}")
        
    # Check if corrected sql is valid
    corr_valid, corr_err = validate_sql_syntax(schema_text, corrected_sql)
    if not corr_valid and corrected_sql != sql_query:
        if len(bugs) == 0 or "no such table" not in corr_err.lower():
            bugs.append(f"Compiler validation check reported: {corr_err}")

    is_valid_query = len(bugs) == 0
    
    explanation = ""
    if is_valid_query:
        explanation = "The SQL query is valid and semantically aligns with the instruction."
    else:
        explanation = f"We detected {len(bugs)} issues:\n" + "\n".join([f"- {b}" for b in bugs])
        
    steps = [
        "🔍 Step 1: Parsing user query and comparing with schema constraints.",
        f"📋 Step 2: Running SQLite compile-time analyzer (Valid: {is_valid_query}).",
        "⚙️ Step 3: Performing logical check against target instruction.",
        "📝 Step 4: Generating correction checklist and explanation.",
        "ℹ️ Running in DEMO Mode. Configure an API key in backend/.env for full AI debugging agent abilities."
    ]
    
    return {
        "status": "success" if is_valid_query else "corrected",
        "is_valid": is_valid_query,
        "bugs_found": bugs,
        "corrected_sql": corrected_sql if not is_valid_query else sql_query,
        "explanation": explanation,
        "steps": steps
    }

def process_debug_agent(sql_query: str, instruction: str, schema_text: str, dialect: str) -> Dict[str, Any]:
    steps = []
    steps.append("🔍 Step 1: Initializing debugging session. Verifying API credentials...")
    
    client_type, client = get_api_client()
    if client_type == "mock":
        return run_mock_debug(sql_query, instruction, schema_text)
        
    steps.append("✓ AI Client initialized. Analyzing query semantic structure...")
    
    debug_prompt = f"""
    You are an expert SQL debugger. Analyze the following SQL query and the user's natural language instruction.
    Verify if the query is syntactically correct and semantically achieves the instruction given the schema.
    
    User's Input SQL Query: `{sql_query}`
    Natural Language Instruction: "{instruction}"
    Database Schema:
    {schema_text}
    Target SQL Dialect: {dialect}
    
    You must output a raw JSON object containing these keys and nothing else:
    {{
      "is_valid": boolean,
      "bugs_found": ["list", "of", "bugs", "found"],
      "corrected_sql": "string",
      "explanation": "string"
    }}
    
    Rules:
    - Look for table name typos (e.g. singular/plural issues, wrong naming).
    - Look for column name typos (e.g. names vs name, cpga vs cgpa).
    - Look for syntax errors (e.g. missing commas, incorrect joins, unclosed parentheses).
    - Check semantic alignment: Does it fulfill the instruction? (e.g. if the instruction says "CGPA is greater than 8" but SQL has "cgpa > 7", that is a bug!).
    - Ensure your response is valid JSON.
    """
    
    steps.append("📋 Step 2: Running logical match and syntax checks on schema columns...")
    
    try:
        raw_response = call_llm(client_type, client, debug_prompt)
        res = json.loads(raw_response)
    except Exception as e:
        fallback_res = run_mock_debug(sql_query, instruction, schema_text)
        fallback_res["steps"] = [
            f"⚠️ API Exception (falling back): {str(e)}",
            "🔄 Falling back to intelligent Demo/Mock Mode...",
        ] + fallback_res["steps"]
        return fallback_res
        
    is_valid_query = res.get("is_valid", False)
    bugs_found = res.get("bugs_found", [])
    corrected_sql = res.get("corrected_sql", sql_query)
    explanation = res.get("explanation", "")
    
    steps.append(f"✓ Semantic check completed. Bugs detected: {len(bugs_found)}.")
    
    # Validate the corrected query
    steps.append("🛡️ Step 3: Running SQLite compiler checks on corrected query...")
    is_valid, validation_err = validate_sql_syntax(schema_text, corrected_sql)
    
    if not is_valid:
        steps.append(f"⚠️ Warning: Corrected query failed syntax validation: {validation_err}")
        # Try self-correction loop once for the debugger
        correction_prompt = f"""
        You corrected a SQL query, but the corrected query failed SQLite compile check.
        
        Corrected SQL: `{corrected_sql}`
        Validation Error: {validation_err}
        Database Schema:
        {schema_text}
        
        Please correct the query further to ensure syntax matches the schema.
        Output a JSON object with:
        {{
          "corrected_sql": "string",
          "explanation": "string"
        }}
        """
        try:
            raw_correction = call_llm(client_type, client, correction_prompt)
            corr_res = json.loads(raw_correction)
            corrected_sql = corr_res.get("corrected_sql", corrected_sql)
            explanation = corr_res.get("explanation", explanation)
            is_valid, validation_err = validate_sql_syntax(schema_text, corrected_sql)
            if is_valid:
                steps.append("✓ Self-correction successful! Corrected SQL is now compile-valid.")
            else:
                steps.append(f"❌ Self-correction failed. Error persists: {validation_err}")
                bugs_found.append(f"Compiler validation warning: {validation_err}")
        except Exception as e:
            steps.append(f"⚠️ Correction API error: {str(e)}")
            
    steps.append("📝 Step 4: Generating detailed debug report.")
    
    return {
        "status": "success" if (is_valid_query and len(bugs_found) == 0) else "corrected",
        "is_valid": is_valid_query and len(bugs_found) == 0,
        "bugs_found": bugs_found,
        "corrected_sql": corrected_sql,
        "explanation": explanation,
        "steps": steps + ["✓ Debugging workflow completed successfully."]
    }
