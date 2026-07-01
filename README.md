# SQL Query Agent

### Agentic AI-Powered Any-Language Text to SQL Converter

SQL Query Agent is an interactive AI copilot that translates natural language text (from any language including English, Tamil, Hindi, Malayalam, Telugu, and more) into correct, validated SQL queries. The application implements an advanced self-correcting reasoning pipeline that checks generated syntax inside an in-memory SQLite sandbox, fixes errors in real-time, and guards database schemas using security access block gates.

---
## 🚀 Live Demo

*Deployed Application:* https://sql-query-agent-rs0p.onrender.com/

---

## Key Features

1. **Any Language to SQL Query**
   - Automatically detects query languages (e.g. Tamil: `8 CGPA க்கு மேல உள்ள students காட்டு`, Hindi: `उन सभी छात्रों को दिखाएं जिनका सीजीपीए 8 से अधिक है`).
   - Translates query intent into a target query constraint.

2. **Sandbox Compilation & Self-Correction**
   - Compiles SQL queries using an in-memory SQLite database environment to ensure that tables, column names, and syntax match schema configurations.
   - Run self-correction up to 3 times, passing the parser error diagnostics back to the LLM to patch syntax errors before outputting.

3. **Query Safety Access Controls**
   - Scans generated scripts to block database modifications (`DROP`, `DELETE`, `TRUNCATE`, `ALTER`).
   - Displays prominent alerts inside the chatbot conversation thread requiring explicit user consent to override.

4. **Conversational AI Agent UI**
   - Features a premium, humanized split chatbot panel.
   - Shows progressive reasoning logs as the agent processes language, maps schemas, compiles, and explains logic.
   - Enables continuous follow-up questions when schema information is incomplete or ambiguous.

5. **SQLite Persistent History**
   - Persists all successfully generated query details in a local backend SQLite database (`backend/history.db`), offering options to copy, download, or re-run queries in the chat window.

6. **SQL Query Debugger Workspace**
   - Dedicated dashboard panel that accepts a user-provided SQL query with syntax/logical errors and a description of the goal.
   - Compares the SQL query structure against target schema constraints to report table/column typos (e.g. `student` $\rightarrow$ `students`, `names` $\rightarrow$ `name`, `cpga` $\rightarrow$ `cgpa`).
   - Verifies logic errors (e.g. `> 7` instead of `> 8`) and compiles fixes in real-time.
   - Provides visual step-by-step reasoning steps for the repair chain.

---

## Tech Stack

- **Frontend**: React.js + Tailwind CSS (Vite setup with dark/light theme support and responsive visual layouts)
- **Backend**: Python FastAPI
- **Database**: SQLite for persistent query history log
- **AI/NLP model**: Google Gemini API (fallback to OpenAI API, or rule-based Demo Mode if API keys are missing)

---

## Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+

### Step 1: Clone and Configuration
1. Open the project root workspace directory.
2. Duplicate `backend/.env` file from the `.env.example` template:
   ```bash
   cp .env.example backend/.env
   ```

### Step 2: Add API Key
Provide your Gemini API key (or OpenAI API key) inside `backend/.env`:
```env
PORT=8000
GEMINI_API_KEY=your_gemini_api_key_here
# OR
# OPENAI_API_KEY=your_openai_api_key_here
```
*Note: If no API keys are supplied, the application runs in a simulated Demo Mode.*

---

## Running the Application

### Running the Backend
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   - On Windows:
     ```bash
     .\.venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source .venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI dev server:
   ```bash
   python run.py
   ```
   *The backend starts on http://127.0.0.1:8000.*

### Running the Frontend
1. Navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Vite server:
   ```bash
   npm run dev
   ```
   *The frontend starts on http://localhost:5173/.*

---

## Sample Inputs & Outputs

### 1. English
* **Input Question**: `Average age of students in CS department`
* **Target Schema**: `students(id, name, age, department, cgpa)`
* **Generated SQL**:
  ```sql
  SELECT AVG(age) FROM students WHERE department = 'CS';
  ```
* **Explanation**: Calculates the average age of all students enrolled in the Computer Science (CS) department.

### 2. Tamil (Multi-Language)
* **Input Question**: `8 CGPA க்கு மேல உள்ள students காட்டு`
* **Target Schema**: `students(id, name, age, department, cgpa)`
* **Generated SQL**:
  ```sql
  SELECT * FROM students WHERE cgpa > 8;
  ```
* **Explanation**: Retrieves all student details from the database where their cumulative grade point average (CGPA) exceeds 8.0.

### 3. Dangerous Command (Safety Block)
* **Input Question**: `Delete all students whose age is above 25`
* **Action**: Security gate intercepts command, blocks execution, and displays warnings to prevent schema deletion.

---

## Docker Deployment (Option A - Monolith Container)

You can run the entire application (frontend + backend) packaged inside a single container using Docker or Docker Compose.

### Option 1: Running with Docker Compose (Recommended)
1. Ensure your API keys are configured in the `backend/.env` file.
2. Build and start the unified services:
   ```bash
   docker compose up --build
   ```
3. The application will be accessible at `http://localhost:8000`.
4. The history logs database will be stored inside a persistent Docker volume (`history_data`) to prevent data loss.

### Option 2: Running with Raw Docker CLI
1. Build the Docker image:
   ```bash
   docker build -t sql-query-agent .
   ```
2. Run the container and supply API keys as environment variables:
   ```bash
   docker run -p 8000:8000 -e GEMINI_API_KEY=your_gemini_api_key_here sql-query-agent
   ```

