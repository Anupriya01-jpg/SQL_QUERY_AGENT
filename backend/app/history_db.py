import sqlite3
import os

DB_PATH = os.getenv("HISTORY_DB_PATH", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "history.db"))

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS query_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            sql_query TEXT NOT NULL,
            explanation TEXT,
            dialect TEXT NOT NULL,
            detected_language TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_history_item(question: str, sql_query: str, explanation: str, dialect: str, detected_language: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO query_history (question, sql_query, explanation, dialect, detected_language)
        VALUES (?, ?, ?, ?, ?)
    """, (question, sql_query, explanation, dialect, detected_language))
    conn.commit()
    conn.close()

def get_history_items():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, question, sql_query as sql, explanation, dialect, detected_language, created_at as date FROM query_history ORDER BY id DESC")
    rows = cursor.fetchall()
    items = []
    for r in rows:
        items.append({
            "id": r["id"],
            "question": r["question"],
            "sql": r["sql"],
            "explanation": r["explanation"],
            "dialect": r["dialect"],
            "detected_language": r["detected_language"],
            "date": r["date"]
        })
    conn.close()
    return items

def clear_history():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM query_history")
    conn.commit()
    conn.close()
