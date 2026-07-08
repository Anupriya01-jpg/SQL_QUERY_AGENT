import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Terminal,
  History,
  Home,
  Code,
  Copy,
  Check,
  Trash2,
  Play,
  Moon,
  Sun,
  AlertTriangle,
  Download,
  RefreshCw,
  Upload,
  Languages,
  FileText,
  ChevronRight,
  Info,
  Sparkles,
  Plus,
  ArrowRight,
  MessageSquare,
  Send,
  BookOpen,
  ShieldAlert,
  ChevronDown,
  X,
  FileCode,
  Sliders,
  ChevronUp,
  Cpu
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : window.location.origin);

function App() {
  // Navigation & Theme
  const [activeTab, setActiveTab] = useState('home');
  const [darkMode, setDarkMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Used for Database Scope Drawer
  const [expandedHistoryId, setExpandedHistoryId] = useState(null); // Accordion state for history

  // Schema configuration state
  const [schemaText, setSchemaText] = useState(
    "students(id, name, age, department, cgpa)"
  );
  const [customSchemas, setCustomSchemas] = useState(() => {
    const saved = localStorage.getItem('sql_agent_schemas');
    return saved ? JSON.parse(saved) : [
      {
        id: 'students',
        name: 'Students Grading',
        description: 'Student details, age, department, and CGPA.',
        schema: 'students(id, name, age, department, cgpa)'
      },
      {
        id: 'products',
        name: 'E-commerce Store',
        description: 'Products inventory and order transaction records.',
        schema: 'products(id, name, price, stock, category)\norders(id, product_id, quantity, order_date, customer_name)'
      },
      {
        id: 'employees',
        name: 'Employee HR System',
        description: 'Corporate staff directory and department management.',
        schema: 'employees(id, name, position, salary, hire_date, department_id)\ndepartments(id, name, manager)'
      }
    ];
  });
  const [selectedSchemaId, setSelectedSchemaId] = useState('students');
  const [dialect, setDialect] = useState('sqlite');

  // Chatbot conversation state
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'agent',
      status: 'success',
      text: "👋 Hello there! I'm your friendly AI Database Copilot. Think of me as your personal SQL translator! I can translate questions in any language—like English, Tamil, Hindi, or Malayalam—into structured, validated database queries. Which database table would you like to explore today?",
      detected_language: 'System',
      steps: ['✓ Started SQL Query Agent session']
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiMode, setApiMode] = useState('mock'); // 'ai' or 'mock'

  // Query History from SQLite
  const [queryHistory, setQueryHistory] = useState([]);

  // UI styling states
  const [copiedSqlId, setCopiedSqlId] = useState(null);
  const [showNewSchemaModal, setShowNewSchemaModal] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState('');
  const [newSchemaDesc, setNewSchemaDesc] = useState('');
  const [newSchemaText, setNewSchemaText] = useState('');
  
  // Collapsed states for reasoning steps in individual messages
  const [collapsedSteps, setCollapsedSteps] = useState({});

  // Debugger Workspace State
  const [debugSqlInput, setDebugSqlInput] = useState('');
  const [debugInstruction, setDebugInstruction] = useState('');
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugResponse, setDebugResponse] = useState(null);
  const [debugSteps, setDebugSteps] = useState([]);
  const [debugActiveStepIndex, setDebugActiveStepIndex] = useState(0);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // Sync theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Sync custom schemas
  useEffect(() => {
    localStorage.setItem('sql_agent_schemas', JSON.stringify(customSchemas));
  }, [customSchemas]);

  // Fetch backend configurations and SQLite history on component mount
  useEffect(() => {
    fetchConfig();
    fetchHistory();
  }, []);

  // Scroll to bottom of chat when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config`);
      if (res.ok) {
        const data = await res.json();
        setApiMode(data.mode);
      }
    } catch (err) {
      console.error("Failed to connect to backend configuration:", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/history`);
      if (res.ok) {
        const data = await res.json();
        setQueryHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch query history from SQLite:", err);
    }
  };

  const clearHistoryDb = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/history`, { method: 'DELETE' });
      if (res.ok) {
        setQueryHistory([]);
      }
    } catch (err) {
      console.error("Failed to clear query history from SQLite:", err);
    }
  };

  // Handle preset schema selection
  const handleSelectSchema = (id) => {
    setSelectedSchemaId(id);
    const found = customSchemas.find(s => s.id === id);
    if (found) {
      setSchemaText(found.schema);
    }
  };

  // Add custom database schema preset
  const handleAddSchema = () => {
    if (!newSchemaName.trim() || !newSchemaText.trim()) return;
    const newId = newSchemaName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const updated = [
      ...customSchemas,
      {
        id: newId,
        name: newSchemaName,
        description: newSchemaDesc || 'Custom schema',
        schema: newSchemaText
      }
    ];
    setCustomSchemas(updated);
    setSelectedSchemaId(newId);
    setSchemaText(newSchemaText);
    setShowNewSchemaModal(false);
    setNewSchemaName('');
    setNewSchemaDesc('');
    setNewSchemaText('');
  };

  // Delete custom schema from local storage
  const handleDeleteSchema = (id) => {
    const updated = customSchemas.filter(s => s.id !== id);
    setCustomSchemas(updated);
    if (selectedSchemaId === id && updated.length > 0) {
      setSelectedSchemaId(updated[0].id);
      setSchemaText(updated[0].schema);
    }
  };

  // Schema text file reader upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSchemaText(event.target.result);
    };
    reader.readAsText(file);
  };

  // Helper step timer simulation to visually reveal agent's pipeline sequence
  const animateSteps = (agentMsgId, fullSteps, finalData) => {
    let index = 0;
    
    // Start with the first step
    setMessages(prev => prev.map(msg => {
      if (msg.id === agentMsgId) {
        return { ...msg, steps: [fullSteps[0]] };
      }
      return msg;
    }));

    const interval = setInterval(() => {
      index++;
      if (index < fullSteps.length) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === agentMsgId) {
            return { ...msg, steps: [...msg.steps, fullSteps[index]] };
          }
          return msg;
        }));
      } else {
        clearInterval(interval);
        // Replace loading placeholder with finalized payload
        setMessages(prev => prev.map(msg => {
          if (msg.id === agentMsgId) {
            return {
              ...msg,
              status: finalData.status,
              detected_language: finalData.detected_language,
              sql: finalData.sql,
              explanation: finalData.explanation,
              follow_up_question: finalData.follow_up_question,
              warning_message: finalData.warning_message,
              error: finalData.error,
              steps: fullSteps
            };
          }
          return msg;
        }));
        setLoading(false);
        fetchHistory();
      }
    }, 600);
  };

  // Dispatch prompt generation to FastAPI
  const handleSendMessage = async (customPrompt = null, forceDangerous = false) => {
    const promptToSend = customPrompt || inputMessage;
    if (!promptToSend.trim() || loading) return;

    if (!customPrompt) setInputMessage('');

    // Append user message
    const userMsgId = Date.now().toString();
    const userMsg = {
      id: userMsgId,
      sender: 'user',
      text: promptToSend
    };
    setMessages(prev => [...prev, userMsg]);

    // Append loading agent response placeholder
    const agentMsgId = (Date.now() + 1).toString();
    const loadingMsg = {
      id: agentMsgId,
      sender: 'agent',
      status: 'loading',
      text: null,
      steps: ['🔍 Detecting language & intent...']
    };
    setMessages(prev => [...prev, loadingMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: promptToSend,
          schema: schemaText,
          dialect: dialect,
          confirmed_dangerous: forceDangerous
        })
      });

      if (!res.ok) {
        throw new Error('Server returned an error status');
      }

      const data = await res.json();
      
      const rawSteps = data.steps && data.steps.length > 0 
        ? data.steps.map(s => {
            if (s.includes("Analyze user query") || s.includes("Step 1") || s.includes("language")) {
              return "🔍 Detecting language & intent...";
            }
            if (s.includes("Match tables") || s.includes("Step 2") || s.includes("schema")) {
              return "📋 Mapping database fields from schema...";
            }
            if (s.includes("Draft SQL") || s.includes("Step 3") || s.includes("Formulate")) {
              return "⚙️ Drafting SQL statement...";
            }
            if (s.includes("Validate SQL") || s.includes("Step 4") || s.includes("compiler")) {
              return "🛡️ Compiling in-memory Sandbox...";
            }
            if (s.includes("Explain") || s.includes("Step 5") || s.includes("summary")) {
              return "📝 Writing query summary...";
            }
            return s;
          })
        : [
            "🔍 Detecting language & intent...",
            "📋 Mapping database fields from schema...",
            "⚙️ Drafting SQL statement...",
            "🛡️ Compiling in-memory Sandbox...",
            "📝 Writing query summary..."
          ];

      animateSteps(agentMsgId, rawSteps, data);

    } catch (err) {
      setMessages(prev => prev.map(msg => {
        if (msg.id === agentMsgId) {
          return {
            ...msg,
            status: 'error',
            error: "Failed to connect to backend server. Make sure FastAPI run.py is executing on http://127.0.0.1:8000.",
            steps: ['❌ Server connection failure']
          };
        }
        return msg;
      }));
      setLoading(false);
    }
  };

  // Handle SQL Query Debugging
  const handleDebug = async () => {
    if (!debugSqlInput.trim() || !debugInstruction.trim() || debugLoading) return;
    setDebugLoading(true);
    setDebugResponse(null);
    setDebugSteps(["🔍 Step 1: Initializing SQL debugging session..."]);
    setDebugActiveStepIndex(0);

    try {
      const res = await fetch(`${API_BASE}/api/debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql_query: debugSqlInput,
          instruction: debugInstruction,
          schema: schemaText,
          dialect: dialect
        })
      });

      if (!res.ok) {
        throw new Error('API server returned error');
      }

      const data = await res.json();
      
      const rawSteps = data.steps && data.steps.length > 0 
        ? data.steps 
        : [
            "🔍 Step 1: Parsing user query...",
            "📋 Step 2: Running SQLite compile checks...",
            "⚙️ Step 3: Checking logical mapping...",
            "📝 Step 4: Generating debug report..."
          ];

      // Simulate step-by-step reasoning stepper
      let index = 0;
      setDebugSteps([rawSteps[0]]);
      setDebugActiveStepIndex(0);
      
      const interval = setInterval(() => {
        index++;
        if (index < rawSteps.length) {
          setDebugSteps(prev => [...prev, rawSteps[index]]);
          setDebugActiveStepIndex(index);
        } else {
          clearInterval(interval);
          setDebugResponse(data);
          setDebugLoading(false);
        }
      }, 750);

    } catch (err) {
      setDebugSteps(prev => [...prev, "❌ Connection Error: Backend server unreachable."]);
      setDebugResponse({
        status: 'error',
        is_valid: false,
        error: 'Failed to communicate with the SQL Query debugger backend. Make sure the backend server is running.',
        steps: []
      });
      setDebugLoading(false);
    }
  };

  // Copy SQL to clipboard
  const handleCopySql = (sql, itemId) => {
    navigator.clipboard.writeText(sql);
    setCopiedSqlId(itemId);
    setTimeout(() => setCopiedSqlId(null), 2000);
  };

  // Download query as text file
  const handleDownloadSql = (sql) => {
    const element = document.createElement("a");
    const file = new Blob([sql], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "generated_query.sql";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Toggle reason steps open/close
  const toggleSteps = (msgId) => {
    setCollapsedSteps(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  // Toggle history accordion item
  const toggleHistoryItem = (id) => {
    if (expandedHistoryId === id) {
      setExpandedHistoryId(null);
    } else {
      setExpandedHistoryId(id);
    }
  };

  // Dynamic preset suggestions for searching and demonstration
  const schemaPresets = {
    students: [
      { text: "give student_name who have scored mark greater than 80", label: "🔍 Synonym Mapping" },
      { text: "8 CGPA க்கு மேல உள்ள students காட்டு", label: "Tamil Translation" },
      { text: "उन सभी छात्रों को दिखाएं जिनका सीजीपीए 8 से अधिक है", label: "Hindi Translation" },
      { text: "Delete all students whose age is above 25", label: "⚠️ Dangerous Command Test" }
    ],
    products: [
      { text: "List all products in Electronics category", label: "Filter Electronics" },
      { text: "Show total sales revenue from our orders", label: "📊 Join & Revenue SUM" },
      { text: "Find products that are out of stock", label: "Stock Check" },
      { text: "DROP TABLE products;", label: "⚠️ DROP TABLE Warning" }
    ],
    employees: [
      { text: "List employees who earn more than 50000", label: "Salary Filter" },
      { text: "Get manager name for HR department", label: "🏢 Manager Info" },
      { text: "Find employees hired after 2022-01-01", label: "Hire Date Filter" },
      { text: "TRUNCATE TABLE employees;", label: "⚠️ Truncate Warning" }
    ]
  };

  const presetPrompts = schemaPresets[selectedSchemaId] || [
    { text: "Show all records from the table", label: "Select All" }
  ];

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-all duration-300 ${
      darkMode ? 'gradient-bg text-slate-100' : 'gradient-bg-light text-slate-800'
    }`}>
      
      {/* Top Demo Banner if API Key is missing */}
      {apiMode === 'mock' && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 py-2 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2 relative z-50">
          <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
          <span>Running in <strong>Demo/Mock Mode</strong>. Configure API keys in your backend <code>.env</code> file for live translations.</span>
        </div>
      )}

      {/* Modern Floating Header */}
      <header className={`sticky top-0 z-40 px-6 py-4 transition-all duration-300 border-b backdrop-blur-md ${
        darkMode 
          ? 'bg-brand-navy-deep/80 border-slate-800/60 text-white' 
          : 'bg-white/80 border-slate-200 text-slate-800 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="bg-gradient-to-tr from-brand-blue to-brand-purple p-2 rounded-xl text-white shadow-lg shadow-brand-blue/20">
              <Terminal className="w-4 h-4 animate-float" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-brand-blue-glow to-brand-purple-glow">
                SQL QUERY AGENT
              </h1>
              <span className="text-[9px] text-slate-400 font-bold tracking-wider uppercase mt-0.5 block">AI Database Copilot</span>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center bg-slate-900/10 dark:bg-black/20 p-1 rounded-xl border border-slate-200/10">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-250 ${
                activeTab === 'home'
                  ? darkMode
                    ? 'bg-slate-800 text-brand-blue-glow shadow-inner border border-slate-700/50'
                    : 'bg-white text-brand-blue shadow-sm border border-slate-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('chatbot')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-250 ${
                activeTab === 'chatbot'
                  ? darkMode
                    ? 'bg-slate-800 text-brand-blue-glow shadow-inner border border-slate-700/50'
                    : 'bg-white text-brand-blue shadow-sm border border-slate-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              SQL Chatbot
            </button>
            <button
              onClick={() => setActiveTab('debugger')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-250 ${
                activeTab === 'debugger'
                  ? darkMode
                    ? 'bg-slate-800 text-brand-blue-glow shadow-inner border border-slate-700/50'
                    : 'bg-white text-brand-blue shadow-sm border border-slate-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Query Debugger
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-250 ${
                activeTab === 'history'
                  ? darkMode
                    ? 'bg-slate-800 text-brand-blue-glow shadow-inner border border-slate-700/50'
                    : 'bg-white text-brand-blue shadow-sm border border-slate-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              History Logs
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-250 ${
                activeTab === 'about'
                  ? darkMode
                    ? 'bg-slate-800 text-brand-blue-glow shadow-inner border border-slate-700/50'
                    : 'bg-white text-brand-blue shadow-sm border border-slate-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              How It Works
            </button>
          </nav>

          {/* Theme & Menu Actions */}
          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 dark:border-white/5 bg-slate-900/10 dark:bg-black/20">
              <span className={`w-2 h-2 rounded-full ${apiMode === 'ai' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`}></span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                {apiMode === 'ai' ? 'AI ACTIVE' : 'DEMO MODE'}
              </span>
            </div>

            {/* Dark Mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-xl border transition-all duration-300 hover:scale-105 ${
                darkMode 
                  ? 'border-slate-800 bg-slate-900/50 text-amber-400 hover:bg-slate-800' 
                  : 'border-slate-200 bg-slate-50 text-indigo-500 hover:bg-slate-100 shadow-sm'
              }`}
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4 h-4 animate-spin-slow" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sticky Tab bar at bottom */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md p-2 flex justify-around ${
        darkMode ? 'bg-brand-navy-deep/90 border-slate-800/80 text-slate-400' : 'bg-white/90 border-slate-200 text-slate-505 shadow-lg'
      }`}>
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[9px] font-bold ${
            activeTab === 'home' ? 'text-brand-blue-glow' : 'text-slate-400'
          }`}
        >
          <Home className="w-4.5 h-4.5" />
          Home
        </button>
        <button
          onClick={() => setActiveTab('chatbot')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[9px] font-bold ${
            activeTab === 'chatbot' ? 'text-brand-blue-glow' : 'text-slate-400'
          }`}
        >
          <MessageSquare className="w-4.5 h-4.5" />
          Chat
        </button>
        <button
          onClick={() => setActiveTab('debugger')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[9px] font-bold ${
            activeTab === 'debugger' ? 'text-brand-blue-glow' : 'text-slate-400'
          }`}
        >
          <Code className="w-4.5 h-4.5" />
          Debug
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[9px] font-bold ${
            activeTab === 'history' ? 'text-brand-blue-glow' : 'text-slate-400'
          }`}
        >
          <History className="w-4.5 h-4.5" />
          History
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[9px] font-bold ${
            activeTab === 'about' ? 'text-brand-blue-glow' : 'text-slate-400'
          }`}
        >
          <Info className="w-4.5 h-4.5" />
          About
        </button>
      </div>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative pb-16 md:pb-0">
        
        {/* PAGE 1: Home Dashboard */}
        {activeTab === 'home' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 animate-fadeInUp max-w-7xl mx-auto w-full">
            
            {/* Hero Glass Banner */}
            <div className={`p-8 md:p-12 rounded-3xl relative overflow-hidden transition-all duration-300 ${
              darkMode ? 'glass-panel text-white' : 'glass-panel-light text-slate-800'
            }`}>
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Sparkles className="w-80 h-80 text-brand-purple animate-pulseGlow" />
              </div>
              <div className="max-w-2xl space-y-6 relative z-10">
                <span className="px-3.5 py-1 text-[10px] font-bold tracking-wider uppercase text-brand-blue-glow bg-brand-blue/10 border border-brand-blue/20 rounded-full inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-ping"></span>
                  Agentic AI SQL Copilot
                </span>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                  Query Databases in <span className="text-gradient">Natural Language</span>
                </h2>
                <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  SQL Query Agent automatically translates prompts (Tamil, Hindi, English, and more) into structured queries. By integrating an in-memory SQLite sandbox, the compiler compiles, tests, and self-corrects the code in real-time.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <button
                    onClick={() => setActiveTab('chatbot')}
                    className="bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white text-xs font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg flex items-center gap-2 hover:shadow-brand-blue/25 hover:scale-102"
                  >
                    Open SQL Chatbot
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveTab('about')}
                    className={`text-xs font-bold px-6 py-3.5 rounded-xl border transition-all hover:scale-102 ${
                      darkMode 
                        ? 'border-slate-850 bg-slate-900/40 text-slate-300 hover:bg-slate-800' 
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Explore Sandbox Logic
                  </button>
                </div>
              </div>
            </div>

            {/* Key Value Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className={darkMode ? 'glass-card p-6' : 'glass-card-light p-6'}>
                <div className="bg-brand-blue/10 p-2.5 rounded-xl w-fit text-brand-blue mb-4">
                  <Languages className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Multi-Lingual Support</span>
                <h3 className={`text-lg font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Synonym Translations</h3>
                <p className="text-xs text-slate-400 mt-2">Write naturally in English, Tamil, Hindi, or Malayalam.</p>
              </div>

              <div className={darkMode ? 'glass-card p-6' : 'glass-card-light p-6'}>
                <div className="bg-emerald-500/10 p-2.5 rounded-xl w-fit text-emerald-400 mb-4">
                  <Cpu className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Compiler Protection</span>
                <h3 className="text-lg font-bold mt-1 text-emerald-400">Sandbox Verification</h3>
                <p className="text-xs text-slate-400 mt-2">Queries compiled and tested in an in-memory SQLite sandbox.</p>
              </div>

              <div className={darkMode ? 'glass-card p-6' : 'glass-card-light p-6'}>
                <div className="bg-amber-500/10 p-2.5 rounded-xl w-fit text-amber-500 mb-4">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Security Scanners</span>
                <h3 className="text-lg font-bold mt-1 text-amber-500">Access Control Warnings</h3>
                <p className="text-xs text-slate-400 mt-2">Guards columns; blocks execution of DROP, TRUNCATE by default.</p>
              </div>

              <div className={darkMode ? 'glass-card p-6' : 'glass-card-light p-6'}>
                <div className="bg-brand-purple/10 p-2.5 rounded-xl w-fit text-brand-purple mb-4">
                  <Database className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Local Cache DB</span>
                <h3 className={`text-lg font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>SQLite Persistence</h3>
                <p className="text-xs text-slate-400 mt-2">Successful statements are stored in history logs.</p>
              </div>
            </div>

            {/* Pipeline Timeline Diagram */}
            <div className={`p-6 md:p-8 rounded-2xl transition-all duration-300 ${
              darkMode ? 'glass-panel border-slate-800' : 'glass-panel-light border-slate-200'
            }`}>
              <h3 className="font-extrabold text-lg mb-6 flex items-center gap-2">
                <Code className="w-5 h-5 text-brand-purple" />
                Agentic Self-Correction Compiler Sequence
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 relative">
                {/* Horizontal progress bar connecting points on big screens */}
                <div className="hidden lg:block absolute top-[28px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-brand-blue/30 via-brand-purple/30 to-emerald-500/30 -z-10"></div>
                
                <div className="flex gap-4 lg:flex-col items-start lg:items-center text-left lg:text-center">
                  <div className="w-10 h-10 rounded-full bg-brand-blue/10 border-2 border-brand-blue flex items-center justify-center font-bold text-brand-blue text-sm flex-shrink-0">
                    01
                  </div>
                  <div>
                    <h4 className="font-bold text-xs mt-1.5">Prompt Parsing</h4>
                    <p className="text-[11px] text-slate-400 mt-1">Detects languages and maps column synonyms.</p>
                  </div>
                </div>

                <div className="flex gap-4 lg:flex-col items-start lg:items-center text-left lg:text-center">
                  <div className="w-10 h-10 rounded-full bg-brand-purple/10 border-2 border-brand-purple flex items-center justify-center font-bold text-brand-purple text-sm flex-shrink-0">
                    02
                  </div>
                  <div>
                    <h4 className="font-bold text-xs mt-1.5">Schema Restriction</h4>
                    <p className="text-[11px] text-slate-400 mt-1">Conforms logic to active table definitions.</p>
                  </div>
                </div>

                <div className="flex gap-4 lg:flex-col items-start lg:items-center text-left lg:text-center">
                  <div className="w-10 h-10 rounded-full bg-pink-500/10 border-2 border-pink-500 flex items-center justify-center font-bold text-pink-400 text-sm flex-shrink-0">
                    03
                  </div>
                  <div>
                    <h4 className="font-bold text-xs mt-1.5">Draft Generator</h4>
                    <p className="text-[11px] text-slate-400 mt-1">Generates ANSI/SQLite syntax scripts.</p>
                  </div>
                </div>

                <div className="flex gap-4 lg:flex-col items-start lg:items-center text-left lg:text-center">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center font-bold text-amber-500 text-sm flex-shrink-0">
                    04
                  </div>
                  <div>
                    <h4 className="font-bold text-xs mt-1.5">Sandbox Compile</h4>
                    <p className="text-[11px] text-slate-400 mt-1">Verifies structure and self-corrects syntax typos.</p>
                  </div>
                </div>

                <div className="flex gap-4 lg:flex-col items-start lg:items-center text-left lg:text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center font-bold text-emerald-400 text-sm flex-shrink-0">
                    05
                  </div>
                  <div>
                    <h4 className="font-bold text-xs mt-1.5">English Explanation</h4>
                    <p className="text-[11px] text-slate-400 mt-1">Creates natural summaries for quick audits.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 2: SQL Chatbot */}
        {activeTab === 'chatbot' && (
          <div className="flex-1 flex overflow-hidden w-full relative">
            
            {/* Database Scope Drawer Backdrop Overlay */}
            {isSidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-xs transition-opacity duration-300"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}

            {/* Sliding Database Scope Panel (Left Drawer) */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-80 max-w-full flex flex-col justify-between transform transition-transform duration-300 ease-in-out border-r ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } ${
              darkMode ? 'glass-panel text-white border-slate-800' : 'glass-panel-light text-slate-800 border-slate-200 shadow-2xl'
            }`}>
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-slate-200/10 pb-4">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-brand-blue" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Database Scope</h3>
                  </div>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-500/10 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Preset Schema Select */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Preset Table Definitions</label>
                    <select
                      value={selectedSchemaId}
                      onChange={(e) => handleSelectSchema(e.target.value)}
                      className={`w-full text-xs rounded-lg p-2.5 focus:outline-none border focus:ring-1 focus:ring-brand-blue font-semibold ${
                        darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      {customSchemas.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Schema Text DDL Definition */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">DDL SQL Schema</label>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] text-brand-blue-glow hover:text-brand-purple font-bold transition-all flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        Upload
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".sql,.txt"
                        className="hidden"
                      />
                    </div>
                    <textarea
                      rows={6}
                      value={schemaText}
                      onChange={(e) => setSchemaText(e.target.value)}
                      placeholder="students(id, name, age, grade)"
                      className={`w-full font-mono text-[11px] rounded-lg p-3 focus:ring-1 focus:ring-brand-blue outline-none border leading-relaxed ${
                        darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    />
                    <span className="text-[9px] text-slate-500 block leading-tight">
                      Use shorthand: <code>table(col1, col2)</code> or standard <code>CREATE TABLE</code> syntax definitions.
                    </span>
                  </div>

                  {/* SQL Dialect Select */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Output SQL Dialect</label>
                    <select
                      value={dialect}
                      onChange={(e) => setDialect(e.target.value)}
                      className={`w-full text-xs rounded-lg p-2.5 focus:outline-none border focus:ring-1 focus:ring-brand-blue font-semibold ${
                        darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      <option value="sqlite">SQLite</option>
                      <option value="mysql">MySQL (ANSI Standard)</option>
                    </select>
                  </div>

                  {/* Schema Preset Actions */}
                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => setShowNewSchemaModal(true)}
                      className={`w-full py-2 px-3 border border-dashed rounded-lg text-xxs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                        darkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white' : 'border-slate-250 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add custom Preset
                    </button>
                    {customSchemas.length > 3 && (
                      <button
                        onClick={() => handleDeleteSchema(selectedSchemaId)}
                        className="p-2 border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 rounded-lg text-xxs transition-colors"
                        title="Delete selected schema preset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Footer Status */}
              <div className="p-4 border-t border-slate-200/10 bg-slate-950/20 text-[10px] text-slate-450">
                Connected to <code className="text-brand-blue-glow">{API_BASE}</code>
              </div>
            </aside>

            {/* Chatbot Stream Workspace */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/5 h-full">
              
              {/* Chat Top Header Context Bar */}
              <div className={`px-6 py-3.5 border-b flex justify-between items-center ${
                darkMode ? 'bg-brand-navy-deep/20 border-slate-850/60' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xxs font-bold border transition-all ${
                      darkMode 
                        ? 'border-slate-800 text-slate-300 hover:bg-slate-900 bg-slate-900/50' 
                        : 'border-slate-300 text-slate-650 hover:bg-slate-50 bg-white'
                    }`}
                    title="Toggle database scope configurations"
                  >
                    <Sliders className="w-3.5 h-3.5 text-brand-blue" />
                    <span>Scope Configurations</span>
                  </button>
                  <div className="hidden sm:block border-l border-slate-250 dark:border-slate-800 h-6"></div>
                  <span className="text-[10px] font-bold text-slate-400 hidden sm:inline-flex items-center gap-1">
                    <Database className="w-3 h-3 text-slate-500" />
                    Preset Schema: <strong>{customSchemas.find(s => s.id === selectedSchemaId)?.name || 'Custom'}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMessages([
                      {
                        id: 'welcome',
                        sender: 'agent',
                        status: 'success',
                        text: "Welcome back! Ask me a query question related to your database schema.",
                        detected_language: 'System',
                        steps: ['✓ Reset chat session']
                      }
                    ])}
                    className="text-slate-455 hover:text-rose-455 transition-colors p-2 rounded-lg border border-slate-800 dark:border-white/5 hover:border-rose-500/20 bg-slate-900/10 dark:bg-black/10"
                    title="Clear current messages"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Chat Stream Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                <div className="max-w-4xl mx-auto space-y-6">
                  
                  {messages.map((msg) => {
                    const isUser = msg.sender === 'user';
                    
                    if (isUser) {
                      return (
                        <div key={msg.id} className="flex justify-end items-start gap-3 animate-fadeInUp">
                          <div className="max-w-xl rounded-2xl rounded-tr-none px-4.5 py-3 text-xs font-semibold shadow-md bg-gradient-to-r from-brand-blue to-brand-purple text-white">
                            {msg.text}
                          </div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 mt-0.5 border ${
                            darkMode ? 'bg-slate-800 border-slate-700 text-slate-350' : 'bg-slate-100 border-slate-300 text-slate-600'
                          }`}>
                            ME
                          </div>
                        </div>
                      );
                    }

                    // Agent message styling
                    const borderLeftColor = 
                      msg.status === 'success' ? 'border-l-4 border-l-emerald-500' :
                      msg.status === 'dangerous_query' ? 'border-l-4 border-l-amber-500' :
                      msg.status === 'error' ? 'border-l-4 border-l-rose-500' :
                      'border-l-4 border-l-slate-700';

                    return (
                      <div key={msg.id} className="flex justify-start items-start gap-3.5 animate-fadeInUp">
                        {/* Agent Avatar */}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-md shadow-brand-purple/20">
                          <Terminal className="w-4 h-4" />
                        </div>

                        {/* Card Container */}
                        <div className={`max-w-3xl w-full rounded-2xl rounded-tl-none p-5 md:p-6 space-y-5 border transition-all ${borderLeftColor} ${
                          darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-100' : 'bg-white border-slate-200 shadow-sm text-slate-800'
                        }`}>
                          
                          {/* Card Header metadata */}
                          <div className="flex justify-between items-center border-b border-slate-200/10 pb-3">
                            <span className="text-[10px] text-brand-purple-glow font-bold tracking-wider uppercase flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                              AI Generated SQL
                            </span>
                            {msg.detected_language && (
                              <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue-glow font-bold border border-brand-blue/20">
                                Language: {msg.detected_language}
                              </span>
                            )}
                          </div>

                          {/* Welcome / Description Text */}
                          {msg.text && (
                            <p className={`text-xs leading-relaxed font-medium ${darkMode ? 'text-slate-300' : 'text-slate-655'}`}>
                              {msg.text}
                            </p>
                          )}

                          {/* Steps Timeline Reasoning Chain */}
                          {msg.steps && msg.steps.length > 0 && (
                            <div className="border border-slate-800/40 bg-slate-950/20 dark:bg-black/20 rounded-xl overflow-hidden">
                              <button
                                onClick={() => toggleSteps(msg.id)}
                                className="w-full text-[10px] font-bold text-slate-400 px-4 py-3 flex justify-between items-center hover:bg-slate-500/5 transition-colors"
                              >
                                <span className="flex items-center gap-2">
                                  <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                    collapsedSteps[msg.id] ? '' : 'rotate-90'
                                  }`} />
                                  Reasoning Chain Logs ({msg.steps.length} steps)
                                </span>
                                <span className="text-slate-500 uppercase text-[9px] font-bold">Details</span>
                              </button>

                              {!collapsedSteps[msg.id] && (
                                <div className="border-t border-slate-800/20 p-4.5 space-y-3.5 font-mono text-[11px] leading-tight bg-slate-950/40 dark:bg-black/30">
                                  {msg.steps.map((step, idx) => {
                                    // Visual step timeline styling
                                    let circleColor = 'bg-brand-blue';
                                    let ringClass = 'ring-2 ring-brand-blue/10';
                                    let showSpinner = false;
                                    let stepTextClass = 'text-slate-300';
                                    
                                    const isLast = idx === msg.steps.length - 1;

                                    if (step.includes('❌') || step.includes('Error')) {
                                      circleColor = 'bg-rose-500';
                                      ringClass = 'ring-2 ring-rose-500/10 animate-shake';
                                      stepTextClass = 'text-rose-400';
                                    } else if (step.includes('⚠️')) {
                                      circleColor = 'bg-amber-500';
                                      ringClass = 'ring-2 ring-amber-500/10';
                                      stepTextClass = 'text-amber-500';
                                    } else if (step.includes('✓') || step.includes('Success')) {
                                      circleColor = 'bg-emerald-500';
                                      ringClass = 'ring-2 ring-emerald-500/10 animate-checkConfirm';
                                      stepTextClass = 'text-emerald-400';
                                    } else if (isLast && msg.status === 'loading') {
                                      circleColor = 'bg-brand-purple';
                                      ringClass = 'ring-2 ring-brand-purple/20 animate-pulse';
                                      showSpinner = true;
                                      stepTextClass = 'text-transparent bg-clip-text bg-gradient-to-r from-brand-blue-glow to-brand-purple-glow font-bold';
                                    }

                                    return (
                                      <div key={idx} className="flex gap-3.5 items-start">
                                        <div className="relative flex items-center justify-center flex-shrink-0 mt-0.5">
                                          {showSpinner ? (
                                            <RefreshCw className="w-3.5 h-3.5 text-brand-purple animate-spin" />
                                          ) : (
                                            <span className={`w-2 h-2 rounded-full ${circleColor} ${ringClass}`} />
                                          )}
                                        </div>
                                        <p className={`${stepTextClass} flex-1`}>{step}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Loading Status Indicator */}
                          {msg.status === 'loading' && (
                            <div className="flex gap-2.5 items-center justify-center p-4 border border-dashed border-slate-800/40 rounded-xl bg-slate-950/10 dark:bg-black/10">
                              <RefreshCw className="w-4 h-4 text-brand-blue animate-spin" />
                              <span className="text-[11px] text-slate-450 uppercase font-bold tracking-wider animate-pulse">Running In-Memory Sandbox Compilation Tests...</span>
                            </div>
                          )}

                          {/* SQL Editor Terminal Output */}
                          {msg.sql && (
                            <div className="space-y-2 animate-scaleIn">
                              <div className="flex justify-between items-center text-[10px] font-bold text-slate-455">
                                <span className="flex items-center gap-1 text-emerald-400">
                                  <FileCode className="w-3.5 h-3.5" />
                                  COMPILED SQL QUERY
                                </span>
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => handleCopySql(msg.sql, msg.id)}
                                    className="hover:text-brand-blue transition-colors flex items-center gap-1"
                                  >
                                    {copiedSqlId === msg.id ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-400 animate-checkConfirm" />
                                        <span className="text-emerald-400">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                  <span className="text-slate-800">|</span>
                                  <button
                                    onClick={() => handleDownloadSql(msg.sql)}
                                    className="hover:text-brand-purple transition-colors flex items-center gap-1"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Download</span>
                                  </button>
                                </div>
                              </div>
                              
                              <div className="relative group">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-xl"></div>
                                <pre className={`p-4 rounded-xl font-mono text-[11.5px] border whitespace-pre-wrap overflow-x-auto select-all leading-normal ${
                                  darkMode 
                                    ? 'bg-slate-950 border-slate-900 text-emerald-400' 
                                    : 'bg-slate-50 border-slate-200 text-emerald-800 font-bold'
                                }`}>
                                  {msg.sql}
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Explainer Block */}
                          {msg.explanation && (
                            <div className="space-y-1.5 border-t border-slate-200/10 pt-4 animate-scaleIn">
                              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 text-brand-purple" />
                                English Summary Explanation
                              </span>
                              <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-350' : 'text-slate-655'}`}>
                                {msg.explanation}
                              </p>
                            </div>
                          )}

                          {/* SECURITY WARNING ACCESS BLOCK */}
                          {msg.status === 'dangerous_query' && (
                            <div className="p-4 border border-amber-500/20 bg-amber-500/10 rounded-xl space-y-4 animate-shake">
                              <div className="flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <h4 className="font-extrabold text-xs text-amber-500 uppercase tracking-wide">Security Sandbox Blocked command execution</h4>
                                  <p className="text-[10px] text-slate-400 mt-1">{msg.warning_message}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleSendMessage(msg.sql, true)}
                                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-90 text-slate-950 font-extrabold text-[10px] px-4 py-2.5 rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/15"
                              >
                                <ShieldAlert className="w-4 h-4" />
                                Override and Confirm Safety Risks
                              </button>
                            </div>
                          )}

                          {/* CLARIFICATION DIALOG REQUIRED */}
                          {msg.status === 'clarification_needed' && (
                            <div className="p-4 border border-brand-purple/20 bg-brand-purple/5 rounded-xl space-y-3.5">
                              <div className="flex gap-2.5">
                                <Sparkles className="w-4 h-4 text-brand-purple-glow flex-shrink-0 mt-0.5" />
                                <div>
                                  <h4 className="font-extrabold text-xs text-brand-purple-glow uppercase tracking-wide">Clarification Required</h4>
                                  <p className="text-[10px] text-slate-300 mt-1">{msg.follow_up_question}</p>
                                </div>
                              </div>
                              
                              <input
                                type="text"
                                placeholder="Answer details (e.g. Yes, sort descending)..."
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.target.value.trim()) {
                                    const text = e.target.value;
                                    e.target.value = '';
                                    const userMsgIdx = messages.findIndex(m => m.sender === 'user');
                                    const queryRef = userMsgIdx !== -1 ? messages[userMsgIdx].text : 'Query';
                                    handleSendMessage(`${queryRef} (Note: ${text})`);
                                  }
                                }}
                                className={`w-full text-xs rounded-lg px-3.5 py-2.5 outline-none border focus:ring-1 focus:ring-brand-purple transition-all ${
                                  darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                            </div>
                          )}

                          {/* ERROR ALERT BLOCK */}
                          {msg.status === 'error' && (
                            <div className="p-4 border border-rose-500/25 bg-rose-500/10 rounded-xl flex gap-3 items-start animate-shake">
                              <AlertTriangle className="w-4.5 h-4.5 text-rose-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <h4 className="font-extrabold text-xs text-rose-500 uppercase tracking-wide">Agent Compiler Error</h4>
                                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{msg.error}</p>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Chat Input form and pills bar */}
              <div className={`p-4 border-t ${
                darkMode ? 'bg-brand-navy-deep/45 border-slate-850/60' : 'bg-white border-slate-200'
              }`}>
                <div className="max-w-4xl mx-auto space-y-3">
                  
                  {/* Prompt Preset Suggestion Pills */}
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-nowrap mask-gradient">
                    {presetPrompts.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(preset.text)}
                        disabled={loading}
                        className={`text-[10px] px-3.5 py-2 font-bold rounded-xl border transition-all duration-200 flex-shrink-0 hover:scale-102 ${
                          darkMode 
                            ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white' 
                            : 'bg-slate-50 border-slate-250 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Input field wrapper */}
                  <div className="flex gap-2.5 items-center">
                    <textarea
                      rows={1}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Translate natural language to SQL (e.g. show product list)..."
                      className={`flex-1 rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-brand-blue resize-none border leading-normal shadow-inner transition-all ${
                        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={loading || !inputMessage.trim()}
                      className="bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-95 disabled:opacity-40 text-white p-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center flex-shrink-0 hover:scale-103"
                    >
                      {loading ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* PAGE 3: Query History Page */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 animate-fadeInUp max-w-5xl mx-auto w-full">
            
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">Query history logs</h2>
                <p className="text-slate-455 text-xs mt-1">
                  All successful SQL translations verified in SQLite Sandbox.
                </p>
              </div>
              {queryHistory.length > 0 && (
                <button
                  onClick={clearHistoryDb}
                  className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-405 font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All History
                </button>
              )}
            </div>

            {/* Logs List accordion container */}
            {queryHistory.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl border border-dashed ${
                darkMode ? 'bg-slate-900/20 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <Terminal className="w-10 h-10 mx-auto text-inherit mb-3 stroke-[1.5]" />
                <p className="font-semibold text-xs uppercase tracking-wider">No Query logs stored</p>
                <p className="text-[11px] mt-1 text-slate-500">
                  Run compilations in the SQL Chatbot page to generate logs.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {queryHistory.map((item) => {
                  const isOpen = expandedHistoryId === item.id;

                  return (
                    <div 
                      key={item.id} 
                      className={`rounded-2xl border transition-all duration-300 ${
                        darkMode 
                          ? 'glass-card border-slate-800 bg-slate-900/40 text-white' 
                          : 'glass-card-light border-slate-200 bg-white text-slate-808'
                      }`}
                    >
                      {/* Accordion Trigger Header */}
                      <div 
                        onClick={() => toggleHistoryItem(item.id)}
                        className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-500/5 transition-colors rounded-t-2xl"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs md:text-sm tracking-tight leading-snug">
                              "{item.question}"
                            </span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue-glow font-extrabold uppercase">
                              {item.dialect}
                            </span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-purple/15 text-brand-purple-glow font-extrabold uppercase">
                              {item.detected_language}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-500 block">{item.date || 'Compiled SQLite sandbox item'}</span>
                        </div>

                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSchemaId('students');
                              setDialect(item.dialect);
                              setActiveTab('chatbot');
                              handleSendMessage(item.question);
                            }}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-colors ${
                              darkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            Re-run
                          </button>
                          
                          <div className="p-1 rounded-lg hover:bg-slate-500/10 transition-colors text-slate-400">
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Details Container */}
                      {isOpen && (
                        <div className="p-5 border-t border-slate-200/10 grid grid-cols-1 md:grid-cols-2 gap-5 animate-scaleIn">
                          {/* SQL block */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                              <span>SQL COMMAND</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleCopySql(item.sql, item.id)}
                                  className="hover:text-brand-blue transition-colors flex items-center gap-1"
                                >
                                  {copiedSqlId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                <span>|</span>
                                <button
                                  onClick={() => handleDownloadSql(item.sql)}
                                  className="hover:text-brand-purple transition-colors flex items-center gap-1"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <pre className={`p-4 rounded-xl font-mono text-[11px] border whitespace-pre-wrap overflow-x-auto leading-relaxed select-all ${
                              darkMode ? 'bg-slate-950 border-slate-900 text-emerald-300' : 'bg-slate-50 border-slate-200 text-emerald-800 font-bold'
                            }`}>
                              {item.sql}
                            </pre>
                          </div>

                          {/* Explanation block */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Translation Explanation</span>
                            <div className={`p-4 rounded-xl text-xs border leading-relaxed ${
                              darkMode ? 'bg-slate-950/40 border-slate-900 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-750'
                            }`}>
                              {item.explanation}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PAGE 4: About System Page */}
        {activeTab === 'about' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 animate-fadeInUp max-w-4xl mx-auto w-full">
            
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">System details and specs</h2>
              <p className="text-slate-455 text-xs mt-1">
                Explore the core engineering logic powering our agentic translation framework.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className={`p-6 rounded-2xl border space-y-3 ${
                darkMode ? 'glass-card border-slate-800 bg-slate-900/40' : 'glass-card-light border-slate-200 bg-white'
              }`}>
                <div className="bg-brand-blue/10 text-brand-blue p-2 rounded-lg w-fit">
                  <Languages className="w-5 h-5" />
                </div>
                <h3 className={`font-bold text-sm uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>1. Translation & NLP Intent</h3>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-655'}`}>
                  Natural Language inputs are parsed using LLM sequence modeling. The system identifies conditional clauses, aggregation limits, and sorts, resolving user-defined synonyms to map database schema parameters perfectly.
                </p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-3 ${
                darkMode ? 'glass-card border-slate-800 bg-slate-900/40' : 'glass-card-light border-slate-200 bg-white'
              }`}>
                <div className="bg-brand-purple/10 text-brand-purple p-2 rounded-lg w-fit">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className={`font-bold text-sm uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>2. SQLite Memory Sandbox</h3>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-655'}`}>
                  Prior to releasing any SQL string, the engine loads custom DDL table schemas, starts an isolated sandbox SQLite instance, and executes the draft query to verify compile correctness.
                </p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-3 ${
                darkMode ? 'glass-card border-slate-800 bg-slate-900/40' : 'glass-card-light border-slate-200 bg-white'
              }`}>
                <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg w-fit">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <h3 className={`font-bold text-sm uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>3. Agentic Self-Correction</h3>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-655'}`}>
                  If sandbox compilation fails, diagnostics are returned back to the LLM context. The translator parses compile errors, refines syntax structures, and compiles check runs again recursively.
                </p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-3 ${
                darkMode ? 'glass-card border-slate-800 bg-slate-900/40' : 'glass-card-light border-slate-200 bg-white'
              }`}>
                <div className="bg-amber-500/10 text-amber-500 p-2 rounded-lg w-fit">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className={`font-bold text-sm uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>4. Safety Access Scanners</h3>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-655'}`}>
                  To prevent unauthorized data destruction, modification statements (e.g. <code>DROP</code>, <code>DELETE</code>, <code>TRUNCATE</code>) trigger warning logs and require explicitly validated override permissions.
                </p>
              </div>

            </div>

          </div>
        )}

        {/* PAGE 5: SQL Query Debugger */}
        {activeTab === 'debugger' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 animate-fadeInUp max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
                  <Code className="w-8 h-8 text-brand-blue animate-float" />
                  Query Debugger Workspace
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Validate and repair SQL statements. Provide an instruction and the query, then let the agentic compiler trace syntax typos or column name mismatches.
                </p>
              </div>
            </div>

            {/* Presets and Debugging Column */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              
              {/* Inputs Panel (Left) */}
              <div className="xl:col-span-7 space-y-6">
                
                {/* Debugging Preset Cases */}
                <div className={darkMode ? 'glass-card p-6 space-y-4' : 'glass-card-light p-6 space-y-4'}>
                  <h3 className={`font-bold text-xs uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Select a Debugging Preset Case
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        handleSelectSchema('students');
                        setDebugSqlInput('SELECT names FROM student WHERE cpga > 7;');
                        setDebugInstruction('Show all students whose CGPA is greater than 8');
                        setDebugResponse(null);
                        setDebugSteps([]);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        darkMode 
                          ? 'bg-slate-900/40 border-slate-800 hover:border-brand-blue/50 text-slate-350 hover:bg-slate-800/40' 
                          : 'bg-slate-50 border-slate-200 hover:border-brand-blue/50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-brand-blue block mb-1">Students Schema</span>
                      <code className="text-[10px] block truncate text-slate-500 mb-1">SELECT names FROM student...</code>
                      <span className="text-[10px] block italic text-slate-400">Typos: student, names, cpga, 7</span>
                    </button>

                    <button
                      onClick={() => {
                        handleSelectSchema('products');
                        setDebugSqlInput('SELECT SUM(price) FROM products;');
                        setDebugInstruction('Show total sales revenue from our orders');
                        setDebugResponse(null);
                        setDebugSteps([]);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        darkMode 
                          ? 'bg-slate-900/40 border-slate-800 hover:border-brand-blue/50 text-slate-355 hover:bg-slate-800/40' 
                          : 'bg-slate-50 border-slate-200 hover:border-brand-blue/50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-brand-blue block mb-1">E-commerce Schema</span>
                      <code className="text-[10px] block truncate text-slate-500 mb-1">SELECT SUM(price)...</code>
                      <span className="text-[10px] block italic text-slate-400">Logic: Missing Orders join</span>
                    </button>

                    <button
                      onClick={() => {
                        handleSelectSchema('employees');
                        setDebugSqlInput('SELECT name FROM employees WHERE salary < 50000;');
                        setDebugInstruction('List employees who earn more than 50000');
                        setDebugResponse(null);
                        setDebugSteps([]);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        darkMode 
                          ? 'bg-slate-900/40 border-slate-800 hover:border-brand-blue/50 text-slate-355 hover:bg-slate-800/40' 
                          : 'bg-slate-50 border-slate-200 hover:border-brand-blue/50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-brand-blue block mb-1">HR Schema</span>
                      <code className="text-[10px] block truncate text-slate-500 mb-1">SELECT name FROM employees...</code>
                      <span className="text-[10px] block italic text-slate-400">Logic: Opposite comparator</span>
                    </button>
                  </div>
                </div>

                {/* Schema scope preview inside Debugger */}
                <div className={darkMode ? 'glass-card p-6 space-y-3' : 'glass-card-light p-6 space-y-3'}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-455 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-brand-blue" />
                      Active Schema Scope
                    </span>
                    <span className="text-[10px] text-brand-purple-glow font-bold">
                      Preset: {customSchemas.find(s => s.id === selectedSchemaId)?.name || 'Custom Schema'}
                    </span>
                  </div>
                  <pre className={`p-3 rounded-lg border font-mono text-[10px] leading-relaxed overflow-x-auto ${
                    darkMode ? 'bg-slate-950 border-slate-900 text-slate-400' : 'bg-slate-50 border-slate-250 text-slate-600'
                  }`}>
                    {schemaText}
                  </pre>
                </div>

                {/* SQL and Instruction Inputs */}
                <div className={darkMode ? 'glass-card p-6 space-y-5' : 'glass-card-light p-6 space-y-5'}>
                  <div className="space-y-2">
                    <label className={`block font-bold text-xs uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-505'}`}>
                      Original SQL Query (With Bugs)
                    </label>
                    <textarea
                      rows={3}
                      value={debugSqlInput}
                      onChange={(e) => setDebugSqlInput(e.target.value)}
                      placeholder="SELECT names FROM student WHERE cpga > 7;"
                      className={`w-full rounded-xl p-3.5 font-mono text-xs outline-none focus:ring-1 focus:ring-brand-blue border ${
                        darkMode ? 'bg-slate-955 border-slate-855 text-white' : 'bg-slate-50 border-slate-300 text-slate-905'
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`block font-bold text-xs uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-505'}`}>
                      Target Instruction (What it should do)
                    </label>
                    <textarea
                      rows={2}
                      value={debugInstruction}
                      onChange={(e) => setDebugInstruction(e.target.value)}
                      placeholder="Show all students whose CGPA is greater than 8"
                      className={`w-full rounded-xl p-3.5 text-xs outline-none focus:ring-1 focus:ring-brand-blue border ${
                        darkMode ? 'bg-slate-955 border-slate-855 text-white' : 'bg-slate-50 border-slate-300 text-slate-905'
                      }`}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center gap-4 border-t border-slate-200/10 pt-4">
                    <div className="flex gap-2">
                      <select
                        value={dialect}
                        onChange={(e) => setDialect(e.target.value)}
                        className={`text-xxs rounded-lg px-2 py-1.5 focus:outline-none border ${
                          darkMode ? 'bg-slate-900 border-slate-805 text-slate-200' : 'bg-white border-slate-300 text-slate-805'
                        }`}
                      >
                        <option value="sqlite">SQLite</option>
                        <option value="mysql">MySQL</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setDebugSqlInput('');
                          setDebugInstruction('');
                          setDebugResponse(null);
                          setDebugSteps([]);
                        }}
                        className={`px-4.5 py-2 text-xxs font-bold rounded-lg border transition-colors ${
                          darkMode ? 'border-slate-800 text-slate-455 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Clear
                      </button>
                      <button
                        onClick={handleDebug}
                        disabled={debugLoading || !debugSqlInput.trim() || !debugInstruction.trim()}
                        className="bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-95 disabled:opacity-40 text-white font-bold text-xxs px-5 py-2.5 rounded-lg transition-all shadow-md shadow-brand-blue/20 flex items-center gap-1.5 hover:scale-102 cursor-pointer"
                      >
                        {debugLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        {debugLoading ? 'Debugging...' : 'Analyze & Repair'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Steps and Output Panel (Right) */}
              <div className="xl:col-span-5 space-y-6">
                
                {/* Stepper Logic */}
                <div className={darkMode ? 'glass-card p-6' : 'glass-card-light p-6'}>
                  <div className="flex justify-between items-center border-b border-slate-250/10 pb-3 mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-brand-purple" />
                      Debugging Trace Logs
                    </span>
                    {debugLoading && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue-glow font-bold animate-pulse">
                        Compiling
                      </span>
                    )}
                  </div>

                  <div className="border-l-2 border-slate-850/60 ml-2 space-y-5 pl-4.5 text-[11px] py-1 font-mono">
                    {debugSteps.map((step, idx) => {
                      let color = 'bg-brand-blue';
                      if (step.includes('❌') || step.includes('Error')) color = 'bg-rose-500 animate-shake';
                      else if (step.includes('⚠️')) color = 'bg-amber-400';
                      else if (step.includes('✓') || step.includes('success') || step.includes('Successful') || step.includes('completed')) color = 'bg-emerald-500 animate-checkConfirm';

                      return (
                        <div key={idx} className="relative animate-fadeInUp">
                          <div className={`absolute -left-[24px] top-0.5 w-2 h-2 rounded-full ${color}`} />
                          <p className={idx === debugSteps.length - 1 ? 'text-brand-blue-glow font-bold' : 'text-slate-400'}>
                            {step}
                          </p>
                        </div>
                      );
                    })}

                    {debugSteps.length === 0 && (
                      <div className="text-slate-500 italic py-1">
                        Workspace idle. Input SQL query and click Analyze to launch.
                      </div>
                    )}
                  </div>
                </div>

                {/* Debug Outputs Report */}
                {debugResponse && (
                  <div className="space-y-6 animate-scaleIn">
                    
                    {/* Status Card */}
                    <div className={`p-5 rounded-2xl border ${
                      debugResponse.is_valid 
                        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 animate-checkConfirm' 
                        : 'border-amber-500/20 bg-amber-500/5 text-amber-500 animate-scaleIn'
                    }`}>
                      <div className="flex gap-3">
                        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${debugResponse.is_valid ? 'text-emerald-400' : 'text-amber-500'}`} />
                        <div>
                          <h4 className="font-extrabold text-xs uppercase tracking-wide">
                            {debugResponse.is_valid ? 'No Bugs Detected' : 'Bugs Identified & Corrected'}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                            {debugResponse.is_valid 
                              ? 'Your query compiles perfectly and satisfies the target instruction.' 
                              : `We identified ${debugResponse.bugs_found?.length || 0} syntax/logical bugs.`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bugs List */}
                    {debugResponse.bugs_found && debugResponse.bugs_found.length > 0 && (
                      <div className={darkMode ? 'glass-card p-6 space-y-3' : 'glass-card-light p-6 space-y-3'}>
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Detected Anomalies</h3>
                        <div className="space-y-2">
                          {debugResponse.bugs_found.map((bug, idx) => (
                            <div key={idx} className="p-3 rounded-xl border border-rose-500/10 bg-rose-500/5 text-[11px] text-rose-455 font-mono leading-relaxed">
                              {bug}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Corrected SQL Output */}
                    {debugResponse.corrected_sql && (
                      <div className={darkMode ? 'glass-card p-6 space-y-3' : 'glass-card-light p-6 space-y-3'}>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <FileCode className="w-4 h-4" />
                            REPAIRED SQL QUERY
                          </span>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleCopySql(debugResponse.corrected_sql, 'debug')}
                              className="hover:text-brand-blue transition-colors flex items-center gap-1 cursor-pointer"
                              title="Copy SQL to Clipboard"
                            >
                              {copiedSqlId === 'debug' ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400 animate-checkConfirm" />
                                  <span className="text-emerald-400 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                            <span className="text-slate-800">|</span>
                            <button
                              onClick={() => handleDownloadSql(debugResponse.corrected_sql)}
                              className="hover:text-brand-purple transition-colors flex items-center gap-1 cursor-pointer"
                              title="Download SQL File"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                          </div>
                        </div>

                        <pre className={`p-4 rounded-xl font-mono text-[11.5px] border leading-relaxed whitespace-pre-wrap select-all ${
                          darkMode ? 'bg-slate-950 border-slate-900 text-emerald-400' : 'bg-slate-50 border-slate-200 text-emerald-800 font-bold'
                        }`}>
                          {debugResponse.corrected_sql}
                        </pre>
                      </div>
                    )}

                    {/* Explanation */}
                    {debugResponse.explanation && (
                      <div className={darkMode ? 'glass-card p-6 space-y-2' : 'glass-card-light p-6 space-y-2'}>
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-brand-purple" />
                          Fix Summary Report
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                          {debugResponse.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* New Schema Creation Modal Popup */}
      {showNewSchemaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className={`w-full max-w-lg rounded-2xl p-6 space-y-5 border shadow-2xl animate-scaleIn ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200/10 pb-3">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">Create Custom Schema Preset</h3>
              <button 
                onClick={() => setShowNewSchemaModal(false)}
                className="p-1 rounded-lg hover:bg-slate-500/10 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Form Fields */}
            <div className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Preset Name</label>
                <input
                  type="text"
                  value={newSchemaName}
                  onChange={(e) => setNewSchemaName(e.target.value)}
                  placeholder="e.g. Products Inventory"
                  className={`w-full text-xs rounded-lg p-2.5 outline-none border focus:ring-1 focus:ring-brand-blue font-semibold ${
                    darkMode ? 'bg-slate-950 border-slate-850 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Brief Description</label>
                <input
                  type="text"
                  value={newSchemaDesc}
                  onChange={(e) => setNewSchemaDesc(e.target.value)}
                  placeholder="e.g. Products list details"
                  className={`w-full text-xs rounded-lg p-2.5 outline-none border focus:ring-1 focus:ring-brand-blue font-semibold ${
                    darkMode ? 'bg-slate-955 border-slate-855 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">DDL Schema definitions</label>
                <textarea
                  rows={4}
                  value={newSchemaText}
                  onChange={(e) => setNewSchemaText(e.target.value)}
                  placeholder="scores(id, student_id, score_value)"
                  className={`w-full text-xs font-mono rounded-lg p-3 outline-none border focus:ring-1 focus:ring-brand-blue leading-normal ${
                    darkMode ? 'bg-slate-955 border-slate-855 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/10">
              <button
                onClick={() => setShowNewSchemaModal(false)}
                className={`px-4 py-2.5 text-xs font-bold rounded-lg border ${
                  darkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddSchema}
                className="bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-all shadow-md shadow-brand-blue/20"
              >
                Save Preset Schema
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
