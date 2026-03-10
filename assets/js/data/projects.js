/**
 * Portfolio project metadata.
 * Each project maps to a card in the Projects section.
 *
 * Tech badge categories determine colour:
 *   llm      → indigo    (AI/LLM models)
 *   backend  → emerald   (Python, APIs)
 *   frontend → cyan      (React, Streamlit)
 *   cloud    → blue      (Azure, GCP, AWS)
 *   data     → amber     (DBs, vector stores)
 *   mlops    → rose      (DVC, MLflow, Docker)
 */
const PROJECTS = [
  {
    id: "d2lt-enhanced",
    title: "Document Intelligence Pipeline",
    subtitle: "Vision-LLM · 4-Phase Async Architecture",
    description:
      "Converts complex multi-page insurance-style PDFs to semantic HTML using a 4-phase pipeline: Architect (layout analysis) → Specialist (adaptive extraction) → Builder (HTML assembly) → Verifier (quality checks). Achieves 10–30× speedup through three levels of async parallelism.",
    tech: [
      { label: "Gemini 3.0 Flash", cat: "llm" },
      { label: "GPT-4.1", cat: "llm" },
      { label: "Python asyncio", cat: "backend" },
      { label: "Pydantic", cat: "backend" },
      { label: "Docling", cat: "backend" },
      { label: "ChromaDB", cat: "data" },
    ],
    highlights: [
      "4-phase Map-Reduce pipeline with pluggable AI provider abstraction",
      "Async parallelism at batch, page, and region levels via asyncio.gather()",
      "Token-bucket rate limiter with sliding window — prevents 429s under load",
      "Real-time rich progress UI with live cost tracking across workers",
    ],
    snippets: [
      { label: "Rate Limiter", file: "d2lt-enhanced/rate_limiter.py" },
      { label: "Async Pipeline", file: "d2lt-enhanced/async_pipeline.py" },
    ],
  },
  {
    id: "daiso",
    title: "Privacy-First Local RAG",
    subtitle: "Offline LLM Inference · Full MLOps Stack",
    description:
      "Desktop RAG application built for organisations where data must not leave the premises. Runs entirely offline with Ollama local inference (Gemma 2), ChromaDB for vector retrieval, and a complete MLOps stack for experiment tracking, dataset versioning, and drift monitoring.",
    tech: [
      { label: "Ollama / Gemma 2", cat: "llm" },
      { label: "FastAPI", cat: "backend" },
      { label: "ChromaDB", cat: "data" },
      { label: "DVC", cat: "mlops" },
      { label: "MLflow", cat: "mlops" },
      { label: "Evidently AI", cat: "mlops" },
      { label: "Docker", cat: "mlops" },
      { label: "React + TypeScript", cat: "frontend" },
    ],
    highlights: [
      "100% local inference — no data leaves the machine (CUDA / Metal acceleration)",
      "DVC-tracked dataset versioning for reproducible ingestion runs",
      "MLflow experiment tracking with metric comparison across model versions",
      "Evidently AI monitors embedding drift and query distribution shifts",
    ],
    snippets: [{ label: "RAG Engine", file: "daiso/rag_engine.py" }],
  },
  {
    id: "wfgpt-prod",
    title: "Enterprise RAG Chat Platform",
    subtitle: "Azure OpenAI · Multi-Strategy Retrieval · RBAC",
    description:
      "Production-grade RAG chat deployed on Azure Container Apps. Supports multiple retrieval strategies (semantic, vector, hybrid) with GPT-4V vision support for image-heavy documents, role-based access control, and per-user monthly credit limit enforcement.",
    tech: [
      { label: "Azure OpenAI GPT-4o", cat: "llm" },
      { label: "GPT-4V Vision", cat: "llm" },
      { label: "Python / Quart", cat: "backend" },
      { label: "Azure AI Search", cat: "cloud" },
      { label: "Azure Container Apps", cat: "cloud" },
      { label: "CosmosDB", cat: "data" },
      { label: "Azure AD / RBAC", cat: "cloud" },
      { label: "React + Fluent UI", cat: "frontend" },
      { label: "Bicep IaC", cat: "mlops" },
    ],
    highlights: [
      "Multi-step RAG: query rewriting → retrieval → answer generation via tool calling",
      "Per-user credit limits enforced via async decorator — returns HTTP 429 when exceeded",
      "Vision-augmented retrieval combines text chunks with GPT-4V image understanding",
      "Prompt management via .prompty files — swap prompts without code changes",
    ],
    snippets: [
      { label: "Chat Approach", file: "wfgpt-prod/chat_approach.py" },
      { label: "RBAC Middleware", file: "wfgpt-prod/rbac_middleware.py" },
    ],
  },
  {
    id: "llmops-platform",
    title: "LLMOps Evaluation Platform",
    subtitle: "Agentic Evaluators · Ensemble Scoring · Experiment Tracking",
    description:
      "End-to-end LLMOps platform for managing, running, and comparing AI evaluation workflows. Combines a Laravel API backend for config/auth with a Python FastAPI execution engine. Evaluators are pluggable Python modules; configs live in the database for zero-redeploy iteration.",
    tech: [
      { label: "OpenAI / Claude", cat: "llm" },
      { label: "Python FastAPI", cat: "backend" },
      { label: "Laravel", cat: "backend" },
      { label: "MLflow", cat: "mlops" },
      { label: "DVC", cat: "mlops" },
      { label: "Docker", cat: "mlops" },
    ],
    highlights: [
      "Hybrid file+DB architecture: evaluator code in git, configs in database",
      "Agentic evaluators run multi-step reasoning chains before scoring",
      "Ensemble scoring combines multiple judges with confidence weighting",
      "Dataset versioning via DVC enables reproducible evaluation benchmarks",
    ],
    snippets: [
      { label: "Agentic Evaluator", file: "llmops-platform/agentic_evaluator.py" },
      { label: "Drift Detector", file: "llmops-platform/drift_detector.py" },
    ],
  },
  {
    id: "elevenow-agents",
    title: "Customer Service Agent Copilot",
    subtitle: "7-Endpoint Conversation API · GPT-4o-mini",
    description:
      "FastAPI backend that acts as a real-time copilot for customer service agents. Analyzes live conversations to identify journey stages, map resolution paths, generate scorecards, and forecast projected resolutions — all via structured JSON responses from GPT-4o-mini.",
    tech: [
      { label: "GPT-4o-mini", cat: "llm" },
      { label: "FastAPI", cat: "backend" },
      { label: "aiohttp", cat: "backend" },
      { label: "Python asyncio", cat: "backend" },
    ],
    highlights: [
      "7 specialised endpoints: journey stage, resolution steps, scorecard, and more",
      "Async LLM client with exponential backoff for 429/5xx error recovery",
      "Markdown-rendered prompts loaded from the filesystem at startup",
      "Projected resolution forecasting from partial conversation transcripts",
    ],
    snippets: [
      { label: "Journey Tracker", file: "elevenow-agents/journey_tracker.py" },
    ],
  },
  {
    id: "elevenow-rag",
    title: "Hybrid RAG with Conversation Intelligence",
    subtitle: "Two-Stage Retrieval · Cohere Reranking · RAG Skip Logic",
    description:
      "Advanced RAG chatbot implementing two-stage retrieval (ChromaDB vector search → Cohere reranker), intelligent RAG skip (avoids redundant retrievals on follow-up questions), query reformulation from conversation context, and token-bounded conversation history management.",
    tech: [
      { label: "OpenAI GPT-4o", cat: "llm" },
      { label: "Cohere Rerank", cat: "llm" },
      { label: "FastAPI", cat: "backend" },
      { label: "ChromaDB", cat: "data" },
      { label: "JWT Auth", cat: "backend" },
    ],
    highlights: [
      "Two-stage retrieval: 25 candidates → Cohere reranker → top-5 with relevance scores",
      "Intelligent RAG skip — LLM decides if conversation history already contains the answer",
      "Query reformulation resolves pronoun references and implicit follow-ups",
      "MD5-keyed pickle cache eliminates duplicate embedding API calls",
    ],
    snippets: [{ label: "Hybrid RAG", file: "elevenow-rag/hybrid_rag.py" }],
  },
  {
    id: "cfmm-papermill",
    title: "Automated Media Analysis Pipeline",
    subtitle: "Parameterised Notebook Execution · Parallel Orchestration",
    description:
      "Orchestrates daily automated analysis across multiple media content categories using Papermill for parameterised Jupyter notebook execution. Each analysis category runs as an independently parameterised notebook, supporting both sequential and parallel execution modes.",
    tech: [
      { label: "Papermill", cat: "mlops" },
      { label: "Jupyter", cat: "mlops" },
      { label: "Python multiprocessing", cat: "backend" },
      { label: "Pandas", cat: "data" },
    ],
    highlights: [
      "Parameterised notebooks via Papermill — same template, different daily parameters",
      "Categories: headlines, generalisation bias, misrepresentation, negative aspects",
      "Parallel execution via multiprocessing.Pool for independent category runs",
      "Fully reproducible: output notebooks capture all execution state",
    ],
    snippets: [
      { label: "Pipeline Runner", file: "cfmm-papermill/pipeline_runner.py" },
    ],
  },
  {
    id: "stem-monitoring",
    title: "Labor Market Skill Gap Dashboard",
    subtitle: "NLP · Curriculum Analytics · Interactive Streamlit",
    description:
      "Multi-page Streamlit analytics dashboard examining emerging skill gaps in a national labor market. Applies NLP to job vacancy data to identify high-demand skills, evaluate curriculum alignment, map emerging job roles, and surface co-occurrence networks across skill clusters.",
    tech: [
      { label: "Streamlit", cat: "frontend" },
      { label: "Python NLP", cat: "backend" },
      { label: "Pandas / NumPy", cat: "data" },
      { label: "NetworkX", cat: "data" },
      { label: "AgGrid", cat: "frontend" },
    ],
    highlights: [
      "6-page interactive dashboard: emerging jobs, skill analysis, curriculum evaluation",
      "NLP pipeline extracts and normalises skills from unstructured job postings",
      "Network science reveals skill co-occurrence clusters and central competencies",
      "Curriculum gap scoring compares academic offerings against market demand",
    ],
    snippets: [
      { label: "Skill Gap Analysis", file: "stem-monitoring/skill_gap_analysis.py" },
    ],
  },
  {
    id: "triage-demo",
    title: "AI-Powered Triage System",
    subtitle: "Claude · XML-Tagged Structured Output · Audit Trail",
    description:
      "Streamlit prototype demonstrating AI-powered case triage. Claude processes unstructured case descriptions and returns structured interpretations + priority decisions using XML-tagged output. All decisions are logged with reference IDs and timestamps for audit trails.",
    tech: [
      { label: "Anthropic Claude", cat: "llm" },
      { label: "Streamlit", cat: "frontend" },
      { label: "Python", cat: "backend" },
      { label: "Pandas", cat: "data" },
    ],
    highlights: [
      "XML-tagged output parsing (<interpretation>, <triage>) for reliable extraction",
      "Reference ID generation and CSV-backed audit trail for all decisions",
      "Multi-turn session state management with Streamlit session_state",
      "Configurable prompts via external prompt modules for easy adaptation",
    ],
    snippets: [
      { label: "Triage Classifier", file: "triage-demo/triage_classifier.py" },
    ],
  },
];
