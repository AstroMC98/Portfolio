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
    impact:
      "Reduces manual document processing FTE by automating extraction from complex multi-page forms — cutting turnaround from hours to minutes at 10–30× throughput.",
    snippets: [
      { label: "Rate Limiter", file: "d2lt-enhanced/rate_limiter.py" },
      { label: "Async Pipeline", file: "d2lt-enhanced/async_pipeline.py" },
    ],
    details: {
      overview: "The pipeline converts multi-page insurance PDFs into structured semantic HTML through four sequential phases, each powered by a vision-capable LLM. An Architect agent analyses the full document layout and assigns a regional extraction strategy per page. Specialist agents then apply those strategies concurrently across regions. A Builder agent assembles validated HTML from all extracted fragments, and a Verifier agent runs quality checks before committing output. Three levels of asyncio parallelism — batch, page, and region — are layered on top to maximise throughput without hitting provider rate limits.",
      architecture: [
        { name: "Architect Agent", desc: "Analyses full document structure and assigns per-page extraction strategies based on detected layout complexity." },
        { name: "Specialist Agent Pool", desc: "Applies layout-specific extraction prompts to individual page regions concurrently via asyncio.gather()." },
        { name: "Builder Agent", desc: "Assembles validated HTML from extracted fragments, resolving cross-page references and table continuations." },
        { name: "Verifier Agent", desc: "Runs structural quality checks on assembled HTML and flags low-confidence regions for review." },
        { name: "Token-Bucket Rate Limiter", desc: "Sliding-window limiter shared across all async workers prevents provider 429s under concurrent load." },
        { name: "Multi-Provider Abstraction", desc: "Pluggable provider interface allows Gemini 3.0 Flash and GPT-4.1 to be swapped or load-balanced without pipeline changes." },
      ],
      benefits: [
        "10–30× throughput increase over sequential single-threaded extraction",
        "Insurance-specific extraction strategies reduce hallucination on complex form layouts",
        "Zero-touch processing — no human review required for standard document types",
        "Real-time cost tracking across workers enables per-document billing accountability",
        "Production-ready rate limiting sustains throughput under continuous batch loads",
      ],
    },
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
    impact:
      "Enables AI adoption in regulated industries (legal, healthcare, finance) where data cannot leave the premises — eliminating cloud API costs and compliance risk simultaneously.",
    snippets: [{ label: "RAG Engine", file: "daiso/rag_engine.py" }],
    details: {
      overview: "DAIso is a fully offline RAG application designed for air-gapped or regulated environments. Ollama runs a local Gemma 2 inference server with optional CUDA or Metal GPU acceleration, completely eliminating outbound API calls. Documents are ingested, chunked, and stored in a local ChromaDB vector store via a FastAPI backend, with DVC tracking each ingestion run for reproducibility. MLflow logs experiment results and Evidently AI monitors for embedding and query distribution drift over time.",
      architecture: [
        { name: "Ollama / Gemma 2 Inference", desc: "Local LLM server with CUDA/Metal support — all inference stays on the host machine with no external API calls." },
        { name: "ChromaDB Vector Store", desc: "Persistent local vector database storing document embeddings for semantic retrieval." },
        { name: "FastAPI Backend", desc: "Stateless REST API handling ingestion, querying, and experiment management endpoints." },
        { name: "React + TypeScript Frontend", desc: "Desktop-style UI for document upload, chat interface, and experiment tracking views." },
        { name: "DVC Ingestion Pipeline", desc: "Tracks dataset versions and pipeline parameters so every ingestion run is fully reproducible from a single command." },
        { name: "MLflow + Evidently AI", desc: "MLflow logs retrieval metrics per experiment; Evidently monitors embedding drift and query distribution shifts over time." },
      ],
      benefits: [
        "100% offline operation — no data leaves the machine, satisfying strict data residency requirements",
        "CUDA and Metal acceleration delivers near-cloud inference speed on local hardware",
        "DVC-versioned ingestion ensures any historical run can be reproduced exactly",
        "Drift monitoring flags model degradation before it affects end-user answer quality",
        "Eliminates recurring cloud API costs for high-volume internal document queries",
      ],
    },
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
    impact:
      "Gives enterprise knowledge workers instant, cited answers from internal document libraries — reducing time-to-answer and cutting support ticket volume for information requests.",
    snippets: [
      { label: "Chat Approach", file: "wfgpt-prod/chat_approach.py" },
      { label: "RBAC Middleware", file: "wfgpt-prod/rbac_middleware.py" },
    ],
    details: {
      overview: "WFGPT is a production enterprise RAG chat platform deployed on Azure Container Apps. It implements a pluggable 'approach' pattern where retrieval strategies (semantic, vector, hybrid) are interchangeable modules registered at startup. Azure AI Search handles multi-strategy retrieval while an async Quart backend orchestrates query rewriting, retrieval, and GPT-4o answer generation via tool calling. GPT-4V extends the system to image-heavy documents. Azure AD integration enforces RBAC, and per-user credit limits are enforced via an async decorator that blocks requests when monthly quotas are exceeded.",
      architecture: [
        { name: "Pluggable Approach Pattern", desc: "Each retrieval strategy (semantic, vector, hybrid) is a self-contained module registered by name — swapped via config without touching core logic." },
        { name: "Azure AI Search", desc: "Handles multi-strategy document retrieval with semantic ranker, vector, and hybrid modes selectable per request." },
        { name: "Quart Async Backend", desc: "Async Python API orchestrates the full pipeline: query rewrite → retrieval → answer generation with citation injection." },
        { name: "GPT-4V Vision Support", desc: "Image-heavy document pages are processed through GPT-4V, with visual understanding merged into the retrieval context." },
        { name: "Azure AD + RBAC", desc: "Team-scoped access control enforced via Azure AD groups; per-user monthly credit limits returned as HTTP 429 when exceeded." },
        { name: "Bicep IaC", desc: "Full infrastructure defined as code — reproducible deployments across dev, staging, and production environments." },
      ],
      benefits: [
        "Multi-strategy retrieval improves answer relevance across document types without retraining",
        "Citation grounding links every answer sentence to a source chunk, reducing hallucination risk",
        "Team-scoped RBAC ensures sensitive knowledge bases are accessible only to authorised groups",
        "Prompt management via .prompty files lets non-engineers update system prompts without code changes",
        "Bicep IaC enables one-command deployment to new Azure subscriptions",
      ],
    },
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
    impact:
      "Standardises AI quality benchmarks across teams and eliminates redeployment cycles for evaluation iteration — making it safe to compare models before committing to production upgrades.",
    snippets: [
      { label: "Agentic Evaluator", file: "llmops-platform/agentic_evaluator.py" },
      { label: "Drift Detector", file: "llmops-platform/drift_detector.py" },
    ],
    details: {
      overview: "The LLMOps Evaluation Platform separates concerns between a Laravel application (UI, authentication, config management, and orchestration) and a Python FastAPI execution engine (stateless evaluation runs). Evaluator modules are Python files in a git-tracked directory; their configurations — prompts, weights, thresholds — live in a PostgreSQL database, enabling zero-redeploy iteration. An agentic evaluator pattern allows each judge to run multi-step reasoning chains before producing a score. An ensemble engine combines multiple judge scores into a weighted Trust Score. Dual drift detection monitors both structural prompt changes and semantic answer distribution shifts.",
      architecture: [
        { name: "Laravel Orchestration Layer", desc: "Manages users, experiment configs, dataset versions, and job scheduling via a web UI and REST API." },
        { name: "FastAPI Evaluation Engine", desc: "Stateless execution service — receives a run config, executes evaluator modules, and returns scored results." },
        { name: "Agentic Evaluator Personas", desc: "Each evaluator runs a multi-step reasoning chain (decompose → assess → score) before committing a numeric judgment." },
        { name: "Ensemble Scoring Engine", desc: "Combines scores from multiple evaluator personas using configurable confidence weights into a single Trust Score." },
        { name: "PostgreSQL + pgvector", desc: "Stores experiment configs, run results, and answer embeddings for semantic similarity queries." },
        { name: "Dual Drift Detection", desc: "Structural drift detects prompt template changes; semantic drift monitors answer embedding distribution shifts across runs." },
      ],
      benefits: [
        "Zero-redeploy evaluation iteration — prompt and weight changes take effect immediately via DB update",
        "HITL annotation workflows let human reviewers correct agentic scores to improve ensemble calibration",
        "Full experiment reproducibility via DVC-versioned datasets and DB-snapshotted configs",
        "Ensemble scoring reduces single-judge bias and produces more stable quality signals",
        "Drift detection catches model degradation between scheduled evaluation runs before production impact",
      ],
    },
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
    impact:
      "Reduces average handle time in contact centres by surfacing resolution paths in real time — enabling agents to resolve complex cases faster without additional training.",
    snippets: [
      { label: "Journey Tracker", file: "elevenow-agents/journey_tracker.py" },
    ],
    details: {
      overview: "The Agent Copilot is a FastAPI service that integrates into a contact centre's real-time conversation stream. It exposes seven specialised endpoints, each targeting a distinct moment in the customer service journey — from opening stage identification through to outcome forecasting. Prompts are loaded from Markdown files at startup so domain teams can update guidance without touching application code. An async LLM client with exponential backoff handles GPT-4o-mini 429 and 5xx errors transparently, ensuring reliability under burst traffic.",
      architecture: [
        { name: "Journey Stage Classifier", desc: "Identifies which phase of the domain-specific journey taxonomy the conversation is currently in (opening → problem discovery → resolution → closure)." },
        { name: "Resolution Path Mapper", desc: "Returns ordered resolution steps based on the detected journey stage and issue type." },
        { name: "Scorecard Generator", desc: "Evaluates agent communication quality across defined rubric dimensions at any point in the conversation." },
        { name: "Outcome Forecaster", desc: "Predicts projected resolution category from a partial conversation transcript." },
        { name: "Async LLM Client", desc: "aiohttp-based client with configurable retry policy and exponential backoff for 429/5xx error recovery." },
        { name: "Markdown Prompt Loader", desc: "Prompt templates loaded from the filesystem at startup — domain teams update prompts without code deploys." },
      ],
      benefits: [
        "Real-time agent guidance reduces reliance on supervisor escalations for complex cases",
        "AHT reduction from surfacing resolution paths mid-conversation rather than post-call",
        "Quality scorecard enables consistent coaching feedback across all agent interactions",
        "Compliance-ready audit output captures journey stages and scores per conversation",
        "Prompt-file architecture lets domain experts iterate on guidance without engineering involvement",
      ],
    },
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
    impact:
      "Cuts redundant retrieval API costs by ~40% via intelligent RAG-skip logic — while maintaining answer quality through two-stage retrieval on queries that genuinely need new context.",
    snippets: [{ label: "Hybrid RAG", file: "elevenow-rag/hybrid_rag.py" }],
    details: {
      overview: "This RAG chatbot implements a two-stage retrieval funnel: ChromaDB returns 25 candidate chunks which are reranked by Cohere to the top 5 with explicit relevance scores. Before any retrieval, a lightweight LLM check decides whether the conversation history already contains a sufficient answer — skipping the retrieval pipeline entirely when it does. A query reformulation step resolves pronouns and implicit references from prior turns before searching. An MD5-keyed pickle cache prevents duplicate embedding API calls for repeated queries.",
      architecture: [
        { name: "RAG Skip Gate", desc: "Fast LLM check evaluates conversation history before retrieval — bypasses the full pipeline on follow-up questions already answered in context." },
        { name: "Query Reformulator", desc: "Rewrites the user query to be self-contained by resolving pronouns and implicit references using prior conversation turns." },
        { name: "ChromaDB Vector Search", desc: "Retrieves 25 candidate chunks via cosine similarity from the persistent local vector store." },
        { name: "Cohere Reranker", desc: "Scores all 25 candidates for relevance and returns the top 5 with explicit scores for transparent ranking." },
        { name: "MD5 Embedding Cache", desc: "Pickle-backed cache keyed by MD5 hash of the query text eliminates duplicate embedding API calls for repeated queries." },
        { name: "JWT Auth + Session TTL", desc: "Stateless JWT authentication with server-side session TTL backup for concurrent multi-user access management." },
      ],
      benefits: [
        "~40% reduction in retrieval API costs from intelligent RAG-skip on follow-up questions",
        "Accurate handling of multi-turn references via query reformulation before retrieval",
        "Top-5 reranked results with relevance scores improve answer grounding over raw vector search",
        "Long-context management via token-bounded history prevents context window overflow",
        "Embedding cache delivers near-instant responses for repeated queries in active sessions",
      ],
    },
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
    impact:
      "Eliminates daily manual reporting effort across multiple analyst teams — delivering consistent, reproducible media analysis outputs on a fully automated schedule.",
    snippets: [
      { label: "Pipeline Runner", file: "cfmm-papermill/pipeline_runner.py" },
    ],
    details: {
      overview: "The pipeline orchestrates daily automated media analysis using Papermill to execute parameterised Jupyter notebooks. Each of four analysis categories — headline framing, generalisation bias, misrepresentation, and negative aspect coverage — runs as a separate notebook template. A top-level orchestrator script injects daily parameters and executes notebooks either sequentially or in parallel via Python's multiprocessing.Pool. Executed notebooks are saved as timestamped output files, serving as both deliverables and full execution audit logs.",
      architecture: [
        { name: "Papermill Orchestrator", desc: "Top-level script that resolves daily parameters, selects execution mode, and dispatches notebook runs." },
        { name: "Parameterised Notebook Templates", desc: "Four analyst-maintained Jupyter notebooks — one per analysis category — with Papermill-tagged parameter cells." },
        { name: "Sequential Execution Mode", desc: "Runs notebooks in defined order for dependency-aware pipelines or constrained execution environments." },
        { name: "Parallel Execution Mode", desc: "multiprocessing.Pool distributes independent category notebooks across CPU cores for faster daily turnaround." },
        { name: "Output Notebook Archive", desc: "Each executed notebook is saved with a timestamp, capturing all cell outputs as a reproducible execution record." },
      ],
      benefits: [
        "Daily zero-touch reporting eliminates manual analyst effort across four content categories",
        "Reproducible outputs — any historical analysis run can be replayed from its parameter set",
        "Parallel execution reduces total pipeline wall-clock time proportional to available CPU cores",
        "Analyst-editable notebook templates let domain experts modify analysis logic without engineering support",
        "Executed notebooks serve as self-contained audit logs capturing all intermediate computation",
      ],
    },
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
    impact:
      "Provides academic institutions with real labour market evidence for curriculum decisions — replacing anecdotal program planning with quantified skill-gap data.",
    snippets: [
      { label: "Skill Gap Analysis", file: "stem-monitoring/skill_gap_analysis.py" },
    ],
    details: {
      overview: "The dashboard analyses national labour market data to quantify skill gaps between academic curricula and employer demand. An NLP pipeline built on spaCy and Gensim processes unstructured job vacancy text, normalising skill mentions against Lightcast and O*NET taxonomies. TF-IDF weighting produces a gap score per skill that reflects both frequency of employer demand and absence from curriculum offerings. NetworkX builds a co-occurrence graph from skill pairs appearing in the same job posting, revealing natural skill cluster boundaries for curriculum bundling decisions.",
      architecture: [
        { name: "NLP Skill Extraction Pipeline", desc: "spaCy and Gensim process raw job vacancy text to extract, normalise, and deduplicate skill mentions." },
        { name: "Taxonomy Alignment", desc: "Extracted skills are mapped to Lightcast and O*NET standard taxonomies for cross-sector comparability." },
        { name: "TF-IDF Gap Scorer", desc: "Produces a quantified gap score per skill reflecting employer demand frequency weighted against curriculum coverage." },
        { name: "NetworkX Co-occurrence Graph", desc: "Builds a skill graph from co-occurring pairs in job postings, revealing cluster boundaries and central connective skills." },
        { name: "6-Page Streamlit Dashboard", desc: "Interactive pages cover emerging job roles, skill demand, curriculum evaluation, gap heatmaps, co-occurrence networks, and policy summaries." },
      ],
      benefits: [
        "National-scale labour market evidence replaces anecdotal curriculum planning with data-driven decisions",
        "Quantified curriculum gap scores enable institutions to prioritise which skills to add or strengthen",
        "Co-occurrence graph reveals natural skill bundles — informing multi-skill course packaging",
        "O*NET and Lightcast alignment ensures findings are comparable with international workforce benchmarks",
        "Policy-ready visual outputs exportable for government and institutional reporting",
      ],
    },
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
    impact:
      "Standardises triage decisions and creates a full audit trail for compliance — enabling consistent, 24/7 AI-assisted case routing without human reviewer bottlenecks.",
    snippets: [
      { label: "Triage Classifier", file: "triage-demo/triage_classifier.py" },
    ],
    details: {
      overview: "The triage system uses Anthropic's Claude API to process unstructured case descriptions and return structured decisions. Claude is prompted to produce XML-tagged output separating interpretation (<interpretation>) from priority decision (<triage>), enabling reliable parsing without brittle regex. Each submission generates an MD5-based reference ID from the case content, making decisions idempotent — submitting the same case twice returns the same reference ID for deduplication. All decisions are appended to a CSV-backed audit log with timestamps, and prompt modules are stored as separate Python files for easy domain adaptation.",
      architecture: [
        { name: "Claude API Integration", desc: "Sends case descriptions to Anthropic Claude with a structured prompt requesting XML-tagged output for reliable parsing." },
        { name: "XML Output Parser", desc: "Extracts <interpretation> and <triage> blocks from Claude's response for clean structured data without fragile JSON parsing." },
        { name: "MD5 Reference ID Generator", desc: "Hashes case content to produce a deterministic reference ID — identical cases produce identical IDs for deduplication." },
        { name: "CSV Audit Log", desc: "Appends every decision with reference ID, timestamp, case text, interpretation, and triage result for compliance review." },
        { name: "Configurable Prompt Modules", desc: "Triage criteria and domain context stored in external Python prompt modules — editable by domain experts without code deploys." },
        { name: "Streamlit Session Management", desc: "Multi-turn session state tracks submission history within a session, supporting case review and comparison." },
      ],
      benefits: [
        "Standardised triage decisions eliminate inter-reviewer variability across case types",
        "Full audit trail with reference IDs supports compliance and retrospective quality review",
        "24/7 availability removes human reviewer bottlenecks for initial case routing",
        "Idempotent reference IDs prevent duplicate decisions on resubmitted cases",
        "Prompt module architecture enables rapid domain adaptation without engineering involvement",
      ],
    },
  },
];
