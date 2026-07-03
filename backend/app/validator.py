import sqlite3
import re

def parse_schema_text(schema_text: str) -> list[str]:
    """
    Parses user-entered database schema text into SQL CREATE TABLE queries.
    Supports formats like:
      - table_name(col1, col2, col3)
      - table_name(col1 INT PRIMARY KEY, col2 TEXT)
      - CREATE TABLE table_name (col1 INT, col2 TEXT)
    """
    ddl_statements = []
    # Split text by lines and semicolons
    lines = re.split(r'[\n;]+', schema_text)
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # If it's already a full CREATE TABLE query, keep it
        if line.upper().startswith("CREATE TABLE"):
            ddl_statements.append(line)
            continue
            
        # Match pattern: table_name (column_definitions)
        match = re.match(r'^([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*)\)$', line)
        if match:
            table_name = match.group(1)
            columns_part = match.group(2)
            
            # Split columns by comma, handling potential commas inside types e.g., DECIMAL(10,2)
            # A simple regex split that ignores commas in parentheses
            columns = []
            current_col = []
            paren_depth = 0
            for char in columns_part:
                if char == '(':
                    paren_depth += 1
                elif char == ')':
                    paren_depth -= 1
                
                if char == ',' and paren_depth == 0:
                    columns.append("".join(current_col).strip())
                    current_col = []
                else:
                    current_col.append(char)
            if current_col:
                columns.append("".join(current_col).strip())
                
            formatted_cols = []
            for col in columns:
                if not col:
                    continue
                # If column definition doesn't have a data type, default to TEXT
                parts = col.split()
                if len(parts) == 1:
                    formatted_cols.append(f"{parts[0]} TEXT")
                else:
                    formatted_cols.append(col)
                    
            create_table_ddl = f"CREATE TABLE {table_name} ({', '.join(formatted_cols)});"
            ddl_statements.append(create_table_ddl)
            
    return ddl_statements

def validate_sql_syntax(schema_text: str, query: str) -> tuple[bool, str]:
    """
    Validates a SQL query by creating the tables in an in-memory SQLite db
    and running EXPLAIN QUERY PLAN on the query.
    Returns (is_valid, error_message).
    """
    try:
        ddl_statements = parse_schema_text(schema_text)
    except Exception as e:
        return False, f"Failed to parse schema: {str(e)}"
        
    if not ddl_statements:
        return False, "No valid table schemas could be parsed."
        
    conn = None
    try:
        conn = sqlite3.connect(":memory:")
        cursor = conn.cursor()
        
        # Create schemas in the memory DB
        for ddl in ddl_statements:
            cursor.execute(ddl)
            
        # Clean query: strip extra spaces/semicolons and execute EXPLAIN
        clean_query = query.strip().rstrip(';')
        
        # SQLite's EXPLAIN validates syntax and schema references (tables/columns)
        # without executing the actual reading/writing operations.
        cursor.execute(f"EXPLAIN QUERY PLAN {clean_query}")
        return True, ""
    except sqlite3.OperationalError as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)
    finally:
        if conn:
            conn.close()
