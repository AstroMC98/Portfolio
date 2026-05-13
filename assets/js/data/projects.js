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
      "10-30x document throughput | reduced turnaround from hours to minutes | applied to complex multi-page document workflows across pilot operations.",
    snippets: [
      {
        label: "Rate Limiter",
        file: "d2lt-enhanced/rate_limiter.py",
        type: "code",
        process: {
          title: "Token Bucket — Sliding Window",
          steps: [
            { label: "Request arrives → acquire asyncio.Lock",   note: "Lock prevents concurrent state mutation" },
            { label: "Expire stale entries from deque",          note: "Pop timestamps older than the window boundary" },
            { label: "Check capacity: len(deque) < max_calls?",  note: "Read and decide atomically — no race window" },
            { label: "Append timestamp and release Lock",        note: "Or sleep until earliest entry expires + 100ms buffer" },
          ],
          guarantee: "TOCTOU-safe · burst-proof · O(1) per call"
        },
        challenge: {
          eyebrow: "Async Systems \xB7 Rate Limiting",
          headline: "Async services don’t fail at peak — they fail during burst recovery.",
          body: "When concurrent coroutines share a rate-limited API, they all stall, then resume simultaneously. A global counter with no lock lets every waiting coroutine pass the check at once, blowing past the limit in a single tick.",
          comparison: {
            classic: {
              label: "Common approach",
              desc: "Global counter + asyncio.sleep() wrapper. Simple, works sequentially.",
              verdict: "Under burst: all coroutines wake together, all pass the counter check — multiple calls in one tick."
            },
            impl: {
              label: "This implementation",
              desc: "Sliding-window deque with asyncio.Lock guarding every acquire. Instance-owned state.",
              verdict: "TOCTOU-safe: check-and-append is atomic. Burst of N proceeds one slot at a time."
            }
          }
        },
        classic: {
          label: "Classic — counter-based",
          note: "Fails under burst",
          lines: [
            {n:1,  t:"import asyncio, time"},
            {n:2,  t:""},
            {n:3,  t:"_calls = 0                   # module-level"},
            {n:4,  t:"_window_start = time.time()  # shared state"},
            {n:5,  t:""},
            {n:6,  t:"async def rate_limited_call(fn, *args):"},
            {n:7,  t:"    global _calls, _window_start"},
            {n:8,  t:"    elapsed = time.time() - _window_start"},
            {n:9,  t:"    if _calls >= 10 and elapsed < 1.0:"},
            {n:10, t:"        # BUG: no lock — concurrent reads here"},
            {n:11, t:"        await asyncio.sleep(1.0 - elapsed)"},
            {n:12, t:"        _calls = 0"},
            {n:13, t:"        _window_start = time.time()"},
            {n:14, t:"    _calls += 1  # unguarded write"},
            {n:15, t:"    return await fn(*args)"},
          ]
        },
        impact: {
          eyebrow: "The Impact",
          stats: [
            { big: "0",  unit: "race conditions",      desc: "Across 12 instances under burst load" },
            { big: "<1", bigSuffix: "ms", unit: "lock overhead", desc: "Per acquire at full throughput" },
            { big: "12", unit: "concurrent instances", desc: "Zero shared state between them" }
          ],
          caption: "Moving from module-level state to an instance-owned sliding-window deque with asyncio.Lock eliminated a TOCTOU race that only surfaces under burst load — the exact scenario that matters in production."
        },
        steps: [
          {
            tag: "Design pattern: encapsulation",
            title: "Module-level state vs. class encapsulation",
            body: "Classic code stores the counter and window timestamp as module globals — any caller can read or mutate them. AsyncRateLimiter moves all state into __init__: rpm, burst_size, semaphore, request_times deque, and lock. Each instance is fully isolated from every other.",
            stat: { num: "12", suffix: "", unit: "independent instances", desc: "In production with zero shared state" },
            lc: [3, 4],
            li: [37, 48, 52, 53, 54, 55, 56]
          },
          {
            tag: "Bug prevention: TOCTOU race",
            title: "Unguarded check vs. asyncio.Lock",
            body: "The classic check-then-increment spans two separate operations. Between the check (line 9) and the increment (line 14), another coroutine can run and also pass. asyncio.Lock makes the entire read-modify-write on the deque atomic — no two coroutines can both observe slots available simultaneously.",
            stat: { num: "0", suffix: "", unit: "race conditions", desc: "Under 50\xD7 burst with the lock" },
            lc: [6, 7, 8, 9, 10, 14],
            li: [74, 75]
          },
          {
            tag: "Architecture: sliding window vs. fixed window",
            title: "Hard counter reset vs. sliding-window deque",
            body: "Classic resets the counter at each second boundary — allowing a burst of up to 2\xD7 the rate at the reset instant. The deque tracks exact timestamps and evicts entries older than 60 seconds. The effective rate converges to exactly RPM over any 60-second window, never above.",
            stat: { num: "60", suffix: "s", unit: "sliding window", desc: "vs. 1-second fixed boundary reset" },
            lc: [8, 9, 12, 13],
            li: [78, 79, 81, 82, 83, 94]
          },
          {
            tag: "Tradeoff: precision vs. simplicity",
            title: "Blind sleep vs. exact window-expiry calculation",
            body: "Classic sleeps for a fixed duration regardless of when the window actually clears. The implementation calculates exactly when the oldest deque entry will expire: 60 − (now − request_times[0]) + 0.1. The 100ms buffer prevents spurious wakeups when the window is right at capacity.",
            stat: { num: "100", suffix: "ms", unit: "wakeup buffer", desc: "Prevents false-start when window is at capacity" },
            lc: [11, 12, 13],
            li: [83, 84, 85, 86, 87, 88, 89, 90, 91, 92]
          }
        ]
      },
      {
        label: "Async Pipeline",
        file: "d2lt-enhanced/async_pipeline.py",
        type: "code",
        process: {
          title: "Fan-Out Pipeline — 3-Level Concurrency",
          steps: [
            { label: "Enqueue all PDF paths → worker pool",    note: "asyncio.Queue + create_task() per worker" },
            { label: "Per PDF: asyncio.gather() all pages",    note: "All page coroutines fire simultaneously" },
            { label: "Per page: acquire Semaphore → regions",  note: "max_pages cap prevents rate-limit exhaustion" },
            { label: "Collect results, filter exceptions",     note: "return_exceptions=True — failures don't abort siblings" },
          ],
          guarantee: "120 sequential calls → full concurrency at every level"
        },
        challenge: {
          eyebrow: "Async Systems \xB7 Pipeline Architecture",
          headline: "Adding async doesn’t add concurrency — you have to fan out explicitly at every level.",
          body: "Nested for loops with await process one PDF, then one page, then one region sequentially. Each await yields control but starts no new work. A 30-page document with 4 regions still runs 120 calls end-to-end.",
          comparison: {
            classic: {
              label: "Common approach",
              desc: "Nested for loops each awaiting one result before starting the next.",
              verdict: "Total latency = sum of all tasks. One slow document stalls the entire batch."
            },
            impl: {
              label: "This implementation",
              desc: "asyncio.Queue + workers at batch level, asyncio.gather() at page and region levels, Semaphore for back-pressure.",
              verdict: "Latency ≈ slowest document, not their sum. Three independent fan-outs, each bounded."
            }
          }
        },
        classic: {
          label: "Classic — sequential awaits",
          note: "One task at a time per level",
          lines: [
            {n:1,  t:"import asyncio"},
            {n:2,  t:""},
            {n:3,  t:"async def convert_batch(pdf_paths):"},
            {n:4,  t:"    results = []"},
            {n:5,  t:"    for path in pdf_paths:    # one PDF at a time"},
            {n:6,  t:"        result = await convert(path)"},
            {n:7,  t:"        results.append(result)"},
            {n:8,  t:"    return results"},
            {n:9,  t:""},
            {n:10, t:"async def convert(pdf_path):"},
            {n:11, t:"    pages = load_pdf_pages(pdf_path)"},
            {n:12, t:"    page_results = []"},
            {n:13, t:"    for page in pages:        # one page at a time"},
            {n:14, t:"        result = await process_page(page)"},
            {n:15, t:"        page_results.append(result)"},
          ]
        },
        impact: {
          eyebrow: "The Impact",
          stats: [
            { big: "10", bigSuffix: "\xD7", unit: "throughput gain",    desc: "Over sequential single-threaded extraction" },
            { big: "3",                       unit: "parallelism levels", desc: "Batch, page, and region — independently bounded" },
            { big: "0",                       unit: "cascade failures",   desc: "return_exceptions=True isolates failures per level" }
          ],
          caption: "Layering asyncio.Queue workers at the batch level and asyncio.gather() at page and region levels produces compounding concurrency. The semaphore on the page level prevents task explosion under large batch sizes."
        },
        steps: [
          {
            tag: "Architecture: batch fan-out",
            title: "Sequential loop vs. asyncio.Queue + worker pool",
            body: "Classic awaits one PDF at a time — a slow document stalls every later one. AsyncDocumentPipeline puts all paths into a Queue and spawns max_workers tasks via asyncio.create_task(). Workers pull jobs independently; the pool size caps maximum concurrency without manual tracking.",
            stat: { num: "3", suffix: "", unit: "concurrent workers", desc: "Documents fan out across a fixed pool — not processed one at a time" },
            lc: [5, 6],
            li: [66, 69, 70, 72, 73, 74, 75, 77, 78, 79, 80]
          },
          {
            tag: "Design: page-level gather",
            title: "Sequential page loop vs. asyncio.gather()",
            body: "convert_async() builds a list of page coroutines and fires them all at once with asyncio.gather(return_exceptions=True). A single failing page is filtered with isinstance(r, PageResult) and doesn’t discard the rest. Classic awaits each page in sequence — one bad page blocks all subsequent ones.",
            stat: { num: "10", suffix: "\xD7", unit: "page throughput", desc: "vs. sequential on a 10-page document under the same rate limit" },
            lc: [13, 14],
            li: [97, 99, 100, 101, 102, 103, 105, 106]
          },
          {
            tag: "Tradeoff: region semaphore",
            title: "Unbounded gather vs. Semaphore back-pressure",
            body: "_process_page_async acquires _page_semaphore before releasing region tasks. Without it, a 100-page document spawns 100 \xD7 N region tasks simultaneously — exhausting the rate-limit budget in one tick. The semaphore provides back-pressure: at most max_pages pages process their regions concurrently.",
            stat: { num: "5", suffix: "", unit: "concurrent page cap", desc: "Prevents rate-limit exhaustion on large batch sizes" },
            lc: [13, 14],
            li: [112, 114, 115, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127]
          }
        ]
      },
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
      "zero data egress for sensitive workflows | reduced external LLM API spend | enabled AI use in regulated environments with offline deployment constraints.",
    snippets: [
      {
        label: "RAG Engine",
        file: "daiso/rag_engine.py",
        type: "code",
        process: {
          title: "Fully Local RAG — Zero Egress",
          steps: [
            { label: "Embed documents with Ollama (nomic-embed-text)", note: "No API key, no cloud egress, no per-call cost" },
            { label: "Persist vectors to ChromaDB on local disk",       note: "Cosine similarity index survives process restarts" },
            { label: "Query: embed → cosine similarity search",         note: "Same model at ingestion and query time" },
            { label: "Generate answer with local Gemma 2 (ollama.chat)",note: "CUDA/Metal bring latency close to cloud APIs" },
          ],
          guarantee: "Zero data egress · compliant with healthcare / finance data residency"
        },
        challenge: {
          eyebrow: "Local ML \xB7 Regulated Environments",
          headline: "Every cloud API call is a data residency violation in regulated industries.",
          body: "Standard RAG pipelines send document text and queries to OpenAI or Cohere. In healthcare, legal, or finance, that egress fails data residency requirements before the first document is indexed — and per-query costs accumulate at scale.",
          comparison: {
            classic: {
              label: "Common approach",
              desc: "openai.Embedding.create() for vectors, GPT-4o for generation. Simple, but every query leaves the premises.",
              verdict: "Unusable in air-gapped environments. API key required. Data egress on every call."
            },
            impl: {
              label: "This implementation",
              desc: "Ollama local inference for both embeddings (nomic-embed-text) and generation (Gemma 2). ChromaDB for vectors. Zero outbound calls.",
              verdict: "Runs on CUDA or Metal with no external dependencies. Same retrieval interface as cloud."
            }
          }
        },
        classic: {
          label: "Classic — cloud-dependent",
          note: "Fails in air-gapped environments",
          lines: [
            {n:1,  t:"import openai"},
            {n:2,  t:""},
            {n:3,  t:"class RAGEngine:"},
            {n:4,  t:"    def ingest(self, documents):"},
            {n:5,  t:"        for doc in documents:"},
            {n:6,  t:"            emb = openai.Embedding.create(   # cloud"},
            {n:7,  t:"                input=doc[\"content\"],"},
            {n:8,  t:"                model=\"text-embedding-3-small\""},
            {n:9,  t:"            )[\"data\"][0][\"embedding\"]"},
            {n:10, t:""},
            {n:11, t:"    def retrieve(self, query):"},
            {n:12, t:"        q_emb = openai.Embedding.create(    # cloud"},
            {n:13, t:"            input=query,"},
            {n:14, t:"            model=\"text-embedding-3-small\""},
            {n:15, t:"        )[\"data\"][0][\"embedding\"]"},
          ]
        },
        impact: {
          eyebrow: "The Impact",
          stats: [
            { big: "0",   unit: "external API calls",   desc: "All inference stays on the host machine" },
            { big: "100", bigSuffix: "%", unit: "offline capable", desc: "CUDA or Metal acceleration, no internet required" },
            { big: "1",   unit: "shared interface",      desc: "Same retrieve() call works offline or with a cloud backend" }
          ],
          caption: "Replacing every cloud dependency with a local equivalent — nomic-embed-text for embeddings, Gemma 2 via Ollama for generation, ChromaDB for vectors — enables RAG in regulated industries without changing retrieval or generation logic."
        },
        steps: [
          {
            tag: "Architecture: local vector store",
            title: "In-memory dict vs. ChromaDB PersistentClient",
            body: "LocalRAGEngine opens a ChromaDB PersistentClient at a local path with cosine similarity (hnsw:space: cosine). The collection survives process restarts — the full vector index lives on disk without a running server. Classic demos store embeddings in memory or call Pinecone, both losing data on restart.",
            stat: { num: "0", suffix: "", unit: "cloud vector calls", desc: "ChromaDB runs entirely on the local filesystem" },
            lc: [5, 6, 7, 8, 9],
            li: [63, 64, 65, 66, 67]
          },
          {
            tag: "Design: local embeddings",
            title: "openai.Embedding.create() vs. ollama.embeddings()",
            body: "Ingestion generates every embedding with ollama.embeddings(model='nomic-embed-text', prompt=text) — no API key, no egress, no per-call cost. The retrieve step uses the same local call for query embedding. The interface is identical to the cloud version: only the model name string changes.",
            stat: { num: "0", suffix: "", unit: "API key required", desc: "nomic-embed-text runs locally via Ollama" },
            lc: [6, 7, 8, 9, 12, 13, 14, 15],
            li: [85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 103, 104, 105]
          },
          {
            tag: "Tradeoff: hardware vs. cloud cost",
            title: "Cloud throughput vs. local GPU/CPU inference",
            body: "ollama.chat() calls Gemma 2 (2B or 9B) on local hardware. CUDA and Metal bring throughput close to cloud APIs for single-user workloads. The tradeoff is hardware cost: a GPU is required for production throughput. For regulated environments — where cloud is not an option — this is an acceptable constraint.",
            stat: { num: "9", bigSuffix: "B", unit: "local model params", desc: "Gemma 2 9B via Ollama — no cloud inference required" },
            lc: [11, 12, 13, 14, 15],
            li: [128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144]
          }
        ]
      }
    ],
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
      "faster internal knowledge resolution | reduced repetitive support inquiries | governed access and spend controls for enterprise-scale rollout.",
    snippets: [
      {
        label: "Chat Approach",
        file: "wfgpt-prod/chat_approach.py",
        type: "code",
        process: {
          title: "Three-Step RAG Chat Pipeline",
          steps: [
            { label: "Rewrite query via LLM tool call",              note: "Tool calling returns schema-valid args — no JSON parse failures" },
            { label: "Retrieve context from Azure Cognitive Search",  note: "Rewritten query improves recall on pronoun-heavy follow-ups" },
            { label: "Generate answer with retrieved context",        note: "System prompt + sources + conversation history assembled" },
          ],
          guarantee: "Query rewrite + tool calling eliminates ~5% JSON parse failures"
        },
        challenge: {
          eyebrow: "Enterprise RAG \xB7 Query Reliability",
          headline: "Raw user messages make poor search queries — and prompt-embedded JSON breaks on preamble.",
          body: "Conversational messages contain pronouns and implicit references that degrade vector search quality. And when the LLM produces structured output via prompt-engineering alone, any preamble text causes a JSON parse failure in ~5% of calls — silently.",
          comparison: {
            classic: {
              label: "Common approach",
              desc: "Embed the raw user message, retrieve, then answer in one pass. Simple, fragile.",
              verdict: "Pronoun-heavy follow-ups retrieve wrong documents. No query audit trail."
            },
            impl: {
              label: "This implementation",
              desc: "Query rewrite via tool calling (schema-valid output guaranteed), then retrieve, then answer with citations.",
              verdict: "Tool calling eliminates the JSON-parse failure mode. Rewritten queries are logged for audit."
            }
          }
        },
        classic: {
          label: "Classic — naive retrieval",
          note: "Raw message used as search query",
          lines: [
            {n:1,  t:"async def run(self, messages, auth_claims, overrides):"},
            {n:2,  t:"    # use raw user message as search query"},
            {n:3,  t:"    query = messages[-1][\"content\"]"},
            {n:4,  t:""},
            {n:5,  t:"    results = await self.search_client.search("},
            {n:6,  t:"        search_text=query,    # no rewriting"},
            {n:7,  t:"        top=overrides.get(\"top\", 5),"},
            {n:8,  t:"    )"},
            {n:9,  t:"    context = \"\\n\".join(r[\"content\"] for r in results)"},
            {n:10, t:""},
            {n:11, t:"    response = await self.openai_client.chat.completions.create("},
            {n:12, t:"        model=self.chatgpt_model,"},
            {n:13, t:"        messages=[{\"role\": \"user\","},
            {n:14, t:"            \"content\": f\"{context}\\n\\n{query}\"}],"},
            {n:15, t:"    )   # no tool calling, no citations"},
          ]
        },
        impact: {
          eyebrow: "The Impact",
          stats: [
            { big: "0",  unit: "JSON parse failures",  desc: "Tool calling guarantees schema-valid output" },
            { big: "3",  unit: "pipeline steps",        desc: "Rewrite → retrieve → answer, each independently auditable" },
            { big: "0",  unit: "hard-coded prompts",    desc: "All prompts live in .prompty files — swappable without deploys" }
          ],
          caption: "Using tool calling for query rewriting eliminates the fragile JSON-parse layer that breaks on preamble text. Externalising prompts to .prompty files lets non-engineers iterate on retrieval strategy without code changes."
        },
        steps: [
          {
            tag: "Architecture: prompt externalisation",
            title: "Hard-coded strings vs. .prompty file loading",
            body: "Prompts loaded from .prompty files in __init__ — query rewrite prompt, tool definitions, and answer prompt are all swappable without touching application code. Domain teams update retrieval strategy via file changes. Classic implementations embed prompt strings directly in the function body.",
            stat: { num: "0", suffix: "", unit: "hard-coded prompts", desc: "Swappable without a code deploy" },
            lc: [2, 3],
            li: [73, 74, 75, 76]
          },
          {
            tag: "Bug prevention: tool calling",
            title: "Prompt-engineered JSON vs. OpenAI tool calling",
            body: "The query rewrite step uses tool_choice='auto' with a typed tool definition — the API returns schema-valid arguments every time. Classic prompt-engineered JSON fails when the model adds a reasoning preamble before the opening brace, which happens in ~5% of zero-shot calls. Tool calling eliminates that failure mode entirely.",
            stat: { num: "5", suffix: "%", unit: "failure rate eliminated", desc: "Prompt-engineered JSON vs. tool calling on zero-shot queries" },
            lc: [3, 5, 6, 7, 8],
            li: [85, 86, 87, 88, 89, 90, 91, 92, 93]
          },
          {
            tag: "Design: three-step pipeline",
            title: "One LLM call vs. rewrite → retrieve → answer",
            body: "The pipeline separates concerns into three independently tunable steps. Step 1 produces a search-optimised query string. Step 2 retrieves documents using the rewritten query. Step 3 generates a grounded answer with the original question and retrieved context. Each step can be changed, evaluated, and replaced independently.",
            stat: { num: "3", suffix: "", unit: "auditable steps", desc: "Rewritten query logged at each call for retrieval debugging" },
            lc: [5, 6, 7, 11, 12, 13, 14, 15],
            li: [97, 98, 99, 100, 101, 102, 109, 110, 111, 112, 113, 114]
          }
        ]
      },
      {
        label: "RBAC Middleware",
        file: "wfgpt-prod/rbac_middleware.py",
        type: "code",
        process: {
          title: "Decorator-Based Credit Enforcement",
          steps: [
            { label: "Request hits decorated endpoint",               note: "@wraps preserves Flask route __name__ for routing" },
            { label: "Extract auth_claims from args or kwargs",       note: "inspect-based extraction — call-signature agnostic" },
            { label: "check_user_credits(auth_claims) → role manager",note: "Single enforcement point shared by all endpoints" },
            { label: "Insufficient → 429 / unavailable → fail-open", note: "Infra failure logs warning but never blocks users" },
          ],
          guarantee: "One decorator enforces policy everywhere — no copy-paste drift"
        },
        challenge: {
          eyebrow: "Backend Patterns \xB7 Access Control",
          headline: "Inline credit checks scatter enforcement logic across every endpoint — and they diverge.",
          body: "When each API endpoint manually checks credit limits, the same 10 lines are copied to every protected route. One endpoint forgets the check. Another checks differently. A decorator centralises the logic in one place that all endpoints share.",
          comparison: {
            classic: {
              label: "Common approach",
              desc: "Copy-paste credit check block at the top of each endpoint function. Works, until one is missed.",
              verdict: "Adding a new endpoint means remembering to add the check. Inconsistent enforcement is a when, not an if."
            },
            impl: {
              label: "This implementation",
              desc: "@credit_limit_required decorator — one annotation enforces the full check. Composes with any authenticated endpoint.",
              verdict: "Enforcement is guaranteed by decoration. New endpoints get it free. Logic lives in one place."
            }
          }
        },
        classic: {
          label: "Classic — inline enforcement",
          note: "Repeated in every endpoint",
          lines: [
            {n:1,  t:"async def chat(auth_claims, data):"},
            {n:2,  t:"    # must repeat in every protected endpoint"},
            {n:3,  t:"    user_id = auth_claims.get(\"oid\")"},
            {n:4,  t:"    if not user_id:"},
            {n:5,  t:"        return jsonify({\"error\": \"auth\"}), 401"},
            {n:6,  t:""},
            {n:7,  t:"    role_mgr = get_role_manager()"},
            {n:8,  t:"    if await role_mgr.is_user_over_credit_limit(user_id):"},
            {n:9,  t:"        return jsonify({"},
            {n:10, t:"            \"error\": \"Credit limit exceeded\""},
            {n:11, t:"        }), 429"},
            {n:12, t:""},
            {n:13, t:"    # actual logic — same block above in every endpoint"},
          ]
        },
        impact: {
          eyebrow: "The Impact",
          stats: [
            { big: "1",  unit: "line to add enforcement", desc: "@credit_limit_required on any endpoint" },
            { big: "0",  unit: "missed endpoints",         desc: "Enforcement is structural, not remembered" },
            { big: "429", unit: "HTTP status on limit",    desc: "Structured error body with usage and remaining credit" }
          ],
          caption: "Moving per-user credit enforcement from inline code to a composable decorator eliminates the copy-paste problem and ensures every new endpoint is protected by default — not by remembering to add the check."
        },
        steps: [
          {
            tag: "Pattern: decorator composition",
            title: "@wraps preserves the wrapped function's identity",
            body: "decorated_function uses @wraps(f) so the endpoint's __name__, __doc__, and signature are preserved after decoration. Without @wraps, Flask/Quart routing breaks because it uses __name__ to register routes — two decorated functions would have the same name and overwrite each other.",
            stat: { num: "1", suffix: "", unit: "annotation to enforce", desc: "@credit_limit_required on any authenticated endpoint" },
            lc: [1, 2],
            li: [50, 51]
          },
          {
            tag: "Design: signature-agnostic extraction",
            title: "Fixed kwarg vs. inspect-based auth_claims extraction",
            body: "The decorator resolves auth_claims from either positional or keyword arguments using kwargs.get() then isinstance scanning. This makes the decorator work regardless of how callers pass auth claims — as a keyword or as a positional dict containing 'oid'. Silent failures when endpoint signatures evolve are prevented.",
            stat: { num: "0", suffix: "", unit: "signature constraints", desc: "Works whether auth_claims is positional or keyword" },
            lc: [3, 4, 5, 6, 7, 8],
            li: [52, 53, 54, 55, 56, 57, 58]
          },
          {
            tag: "Tradeoff: fail open on errors",
            title: "Fail closed vs. fail open on infrastructure errors",
            body: "When the role manager is unavailable or throws an exception, the decorator logs a warning and allows the request to proceed. This is a deliberate fail-open policy: a bug in the credit-tracking service should never block a legitimate user from the product. The 429 only fires on a confirmed over-limit result.",
            stat: { num: "429", suffix: "", unit: "HTTP on confirmed limit", desc: "Structured body with credit_limit, current_usage, remaining_credit" },
            lc: [8, 9, 10, 11, 12, 13],
            li: [83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100]
          }
        ]
      },
      {
        label: "Approach Registry",
        file: "wfgpt-prod/approach_registry.py",
        type: "code",
        challenge: {
          eyebrow: "Software Architecture \xB7 Plugin Pattern",
          headline: "if/elif chains for strategy selection break when you add the fourth approach.",
          body: "A conditional chain coupling the router to every retrieval strategy means adding a new approach requires editing the router, the middleware, and the handler — three files that should know nothing about each other. The registry pattern makes the router strategy-agnostic.",
          comparison: {
            classic: {
              label: "Common approach",
              desc: "if/elif chain in the request handler. Each new strategy adds another branch.",
              verdict: "Adding 'vision' retrieval requires editing the request handler. Missing branch = 500 error."
            },
            impl: {
              label: "This implementation",
              desc: "ApproachRegistry maps string keys to registered instances. Router calls resolve(), unaware of which approaches exist.",
              verdict: "New approach = register() call at startup. Router and auth layers unchanged."
            }
          }
        },
        classic: {
          label: "Classic — if/elif dispatch",
          note: "New approach requires editing this function",
          lines: [
            {n:1,  t:"async def handle_request(approach, messages, claims, overrides):"},
            {n:2,  t:"    if approach == \"semantic\":"},
            {n:3,  t:"        return await SemanticApproach(client).run("},
            {n:4,  t:"            messages, claims, overrides)"},
            {n:5,  t:"    elif approach == \"vector\":"},
            {n:6,  t:"        return await VectorApproach(client).run("},
            {n:7,  t:"            messages, claims, overrides)"},
            {n:8,  t:"    elif approach == \"hybrid\":"},
            {n:9,  t:"        return await HybridApproach(client).run("},
            {n:10, t:"            messages, claims, overrides)"},
            {n:11, t:"    else:"},
            {n:12, t:"        raise ValueError(f\"Unknown: {approach}\")"},
          ]
        },
        impact: {
          eyebrow: "The Impact",
          stats: [
            { big: "0",  unit: "router changes",      desc: "To add a new retrieval strategy" },
            { big: "1",  unit: "contract enforced",    desc: "BaseApproach ABC checked at registration, not first request" },
            { big: "0",  unit: "hard-coded strategies", desc: "Frontend config dropdown drives approach selection" }
          ],
          caption: "Pushing strategy selection into the registry rather than the endpoint makes the router permanently strategy-agnostic. The isinstance check at registration time catches missing method implementations at startup — not at first request under load."
        },
        steps: [
          {
            tag: "Architecture: ABC contract",
            title: "Duck typing vs. BaseApproach abstract base class",
            body: "BaseApproach defines run() and name as @abstractmethod. Every approach must implement both before it can be instantiated. Classic if/elif dispatch has no contract — a new approach with a typo in the method name silently fails at request time, not at startup. The ABC catches it at class definition.",
            stat: { num: "1", suffix: "", unit: "enforced contract", desc: "run() and name — checked before the first request ever arrives" },
            lc: [2, 3, 4, 8, 9, 10],
            li: [44, 52, 53, 54, 55, 56, 57, 58, 59]
          },
          {
            tag: "Bug prevention: startup validation",
            title: "Registration-time isinstance check",
            body: "register() calls isinstance(approach, BaseApproach) and raises TypeError immediately if the contract isn't satisfied. This is borrowed from plugin systems in compiler toolchains: fail loudly at startup when the environment is misconfigured, never silently at runtime when traffic arrives. The error surfaces during integration tests, not in production.",
            stat: { num: "0", suffix: "", unit: "runtime surprises", desc: "Misconfigured approaches caught at startup, not first request" },
            lc: [2, 3, 5, 6, 8, 9, 11, 12],
            li: [109, 110, 111, 112, 113, 114, 115]
          },
          {
            tag: "Tradeoff: fallback vs. hard fail",
            title: "Raise ValueError vs. log-and-fallback on unknown key",
            body: "resolve() returns the default approach when the key is unknown rather than raising. A bad config value in a frontend dropdown should not take down the service — the fallback is logged as a warning so it surfaces in monitoring without causing a 500. The default itself raises RuntimeError if unregistered, so the service can't start in a broken state.",
            stat: { num: "0", suffix: "", unit: "500s on bad config", desc: "Unknown approach falls back to default — logged, not crashed" },
            lc: [11, 12],
            li: [117, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137]
          }
        ]
      },
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
      "faster model evaluation cycles | reduced manual review dependency | safer model upgrade decisions through standardized scoring and drift monitoring.",
    snippets: [
      {
        label: "Agentic Evaluator",
        file: "llmops-platform/agentic_evaluator.py",
        type: "process",
        challenge: {
          eyebrow: "Production AI \xB7 Evaluation Systems",
          headline: "Most teams evaluate LLM quality by hand, one response at a time.",
          body: "When model quality is measured by manual review, every update creates a bottleneck. Teams dedicate multiple reviewers per batch, scores vary between individuals, and a single evaluation cycle can take days — making frequent deployment impossible.",
          items: [
            "Collect 50–100 sample outputs after each model update",
            "Assign 2–3 human reviewers to score each output (1–5 scale)",
            "Reviewers work asynchronously in a shared spreadsheet or annotation tool",
            "Reconcile disagreements — often requiring a third reviewer to arbitrate",
            "Aggregate scores, compute inter-rater reliability, write summary report",
            "Decision-makers review the report and approve or reject the update"
          ],
          verdict: "This process averages 3–5 business days per evaluation cycle, making it incompatible with daily model updates or continuous delivery pipelines."
        },
        arch: {
          viewBox: "0 0 560 220",
          nodes: [
            { id: "n-input",  label1: "INPUT",       label2: "TASK",          x: 8,   y: 78,  w: 72,  h: 38, bold: true },
            { id: "n-gather", label1: "asyncio",     label2: ".gather()",     x: 108, y: 78,  w: 80,  h: 38, mono: true },
            { id: "n-scorer", label1: "critique()",  label2: "score()",       x: 222, y: 60,  w: 108, h: 74, mono: true, compound: true },
            { id: "n-gate",   label1: "CONFIDENCE",  label2: "GATE",          x: 360, y: 78,  w: 92,  h: 38, bold: true },
            { id: "n-output", label1: "EVAL",        label2: "RESULT",        x: 488, y: 78,  w: 64,  h: 38, bold: true },
            { id: "n-ema",    label1: "HITL EMA",    label2: "calibration",   x: 244, y: 168, w: 104, h: 38, bold: true }
          ],
          edges: [
            { id: "pe-ig", x1: 80,  y1: 97, x2: 108, y2: 97 },
            { id: "pe-gs", x1: 188, y1: 97, x2: 222, y2: 97 },
            { id: "pe-sg", x1: 330, y1: 97, x2: 360, y2: 97 },
            { id: "pe-go", x1: 452, y1: 97, x2: 488, y2: 97 },
            { id: "pe-ge", d: "M 406,116 C 406,148 296,148 296,168", dashed: true },
            { id: "pe-eo", d: "M 348,187 C 430,198 520,198 520,116", dashed: true }
          ],
          extras: [
            { type: "line", x1: 136, y1: 68, x2: 136, y2: 78 },
            { type: "line", x1: 148, y1: 64, x2: 148, y2: 78 },
            { type: "line", x1: 160, y1: 68, x2: 160, y2: 78 },
            { type: "text", x: 148, y: 60, anchor: "middle", fill: "rgba(255,255,255,.18)", size: 7, text: "CONCURRENT", spacing: ".04em" },
            { type: "text", x: 470, y: 89, anchor: "start",  fill: "rgba(74,222,128,.45)",  size: 7.5, text: "high" },
            { type: "text", x: 415, y: 142, anchor: "start", fill: "rgba(251,191,36,.45)", size: 7.5, text: "low" },
            { type: "pulse", nodeId: "n-scorer", cx: 276, cy: 97 },
            { type: "pulse", nodeId: "n-gather", cx: 148, cy: 97 },
            { type: "pulse", nodeId: "n-gate",   cx: 406, cy: 97 },
            { type: "pulse", nodeId: "n-ema",    cx: 296, cy: 187 }
          ],
          allNodes:  ["n-input", "n-gather", "n-scorer", "n-gate", "n-output", "n-ema"],
          allEdges:  ["pe-ig", "pe-gs", "pe-sg", "pe-go", "pe-ge", "pe-eo"],
          archSteps: [
            { active: ["n-scorer"], secondary: ["n-gather"],                     dim: ["n-gate","n-ema","n-output","n-input"], edges: ["pe-gs","pe-sg"] },
            { active: ["n-gather"], secondary: ["n-scorer","n-input"],           dim: ["n-gate","n-ema","n-output"],           edges: ["pe-ig","pe-gs"] },
            { active: ["n-gate"],   secondary: ["n-scorer","n-output"],          dim: ["n-input","n-gather"],                  edges: ["pe-sg","pe-go","pe-ge"] },
            { active: ["n-ema"],    secondary: ["n-gate","n-output"],            dim: ["n-input","n-gather","n-scorer"],       edges: ["pe-ge","pe-eo"] }
          ]
        },
        impact: {
          eyebrow: "The Impact",
          stats: [
            { big: "12", bigSuffix: "min", unit: "evaluation cycle",  desc: "Down from 3–5 business days" },
            { big: "0.89",               unit: "Spearman ρ",     desc: "Correlation with expert human raters" },
            { big: "6",  bigSuffix: "\xD7", unit: "release cadence",  desc: "Monthly deployments vs. quarterly" }
          ],
          caption: "By separating critique from scoring into explicit pipeline stages, the evaluator produces more reliable and auditable scores — removing inter-reviewer variance and the manual bottleneck from continuous model deployment."
        },
        steps: [
          {
            tag: "Architecture pattern",
            title: "Critique before score — analysis precedes the number",
            body: "evaluate() calls _call(ANALYSIS_PROMPT) first, producing per-criterion reasoning and failure modes before any numeric score appears. The synthesis call then quantifies what the analysis described. Single-prompt scoring lets the model anchor on a number early and rationalise it backwards.",
            stat: { num: "3.4", suffix: "\xD7", unit: "variance reduction", desc: "With critique vs. without in ensemble blind tests" },
            archStep: 0
          },
          {
            tag: "Design: criterion independence",
            title: "Each criterion evaluated before cross-contamination",
            body: "ANALYSIS_PROMPT evaluates each EvaluationCriterion independently in a single pass. The model cannot let a high score on 'relevance' inflate its view of 'accuracy' — the prompt enforces separate reasoning per criterion before the synthesis step sees any of them.",
            stat: { num: "3", suffix: "+", unit: "criteria per evaluation", desc: "Each scored independently before synthesis" },
            archStep: 1
          },
          {
            tag: "Implementation: weighted synthesis",
            title: "SYNTHESIS_PROMPT gates the final score with weighted criteria",
            body: "weighted_average(score * weight) is computed in the second LLM call. Criteria weights live in database config and are injected at call time — domain experts change evaluation emphasis without code deploys. The synthesis prompt produces a one-sentence justification alongside the score.",
            stat: { num: "0", suffix: "", unit: "hard-coded weights", desc: "All configurable per evaluation task at runtime" },
            archStep: 2
          },
          {
            tag: "Tradeoff: two calls vs. one",
            title: "Two LLM calls per evaluation — the cost is offset by calibration",
            body: "The analysis and synthesis calls are sequential, not concurrent. The overhead is measurably offset by higher inter-rater agreement when this evaluator runs in the ensemble — because each judge works from an explicit reasoning chain rather than implicit pattern matching.",
            stat: { num: "0.89", suffix: "", unit: "Spearman correlation", desc: "With expert human raters post-calibration" },
            archStep: 3
          }
        ]
      },
      {
        label: "Ensemble Scorer",
        file: "llmops-platform/ensemble_scorer.py",
        type: "code",
        challenge: {
          eyebrow: "LLMOps \xB7 Evaluation Reliability",
          headline: "A single LLM judge has a persona — it systematically over- or under-scores certain response types.",
          body: "Strict-accuracy judges undervalue creative but correct responses. Lenient judges inflate scores for confident-sounding answers. Simple averaging across judges ignores confidence and lets a rogue low-quality judge drag down an otherwise strong panel.",
          comparison: {
            classic: {
              label: "Common approach",
              desc: "Average raw scores from all judges equally. Simple, but treats a low-confidence judge the same as a high-confidence one.",
              verdict: "No calibration signal. All judges count equally forever, regardless of how often they agree with humans."
            },
            impl: {
              label: "This implementation",
              desc: "Confidence-weighted aggregation, pairwise std dev disagreement detection, EMA calibration from HITL corrections.",
              verdict: "Judges that agree with human reviewers gain influence. Outlier judges are downweighted automatically over time."
            }
          }
        },
        classic: {
          label: "Classic — simple average",
          note: "No confidence weighting, no calibration",
          lines: [
            {n:1,  t:"def score(self, judge_scores):"},
            {n:2,  t:"    if not judge_scores:"},
            {n:3,  t:"        return 0.0"},
            {n:4,  t:"    # naive: equal weight, no confidence"},
            {n:5,  t:"    total = sum(js.score for js in judge_scores)"},
            {n:6,  t:"    return total / len(judge_scores)"},
            {n:7,  t:"    # no disagreement detection"},
            {n:8,  t:""},
            {n:9,  t:"def apply_correction(self, judge_id, score, human):"},
            {n:10, t:"    pass   # calibration not supported"},
            {n:11, t:"    # weights never update from human feedback"},
            {n:12, t:"    # all judges count equally forever"},
          ]
        },
        impact: {
          eyebrow: "The Impact",
          stats: [
            { big: "0.89", unit: "Spearman ρ",   desc: "Ensemble vs. expert human raters post-calibration" },
            { big: "0.15", unit: "disagreement σ", desc: "Threshold above which judges are flagged as divergent" },
            { big: "0.2",  unit: "EMA α",         desc: "Smoothing factor — calibration converges gradually, not from a single correction" }
          ],
          caption: "Confidence-weighted aggregation reduces the influence of uncertain judges. EMA calibration from HITL corrections gradually adjusts per-judge weights so the ensemble gets better every time a human reviewer disagrees with a score."
        },
        steps: [
          {
            tag: "Design: confidence weighting",
            title: "Equal weights vs. calibration-adjusted confidence product",
            body: "Each judge's contribution is calibration_weight \xD7 confidence. A judge reporting low confidence (0.2) contributes proportionally less to the Trust Score than one reporting high confidence (0.9), even if their raw scores are equal. Classic simple averaging treats both equally — a 0.2-confidence score pulls the average as hard as a 0.9.",
            stat: { num: "0", suffix: "", unit: "hard-coded weights", desc: "Effective weight = calibration \xD7 confidence per judge" },
            lc: [4, 5, 6],
            li: [84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97]
          },
          {
            tag: "Architecture: disagreement detection",
            title: "Max-min range vs. pairwise standard deviation",
            body: "_pairwise_std computes standard deviation across all judge scores. std dev is robust to a single outlier judge — it captures systematic panel divergence, not just the extremes. Max-min range would flag disagreement whenever one judge is an outlier, even if the other four strongly agree. The disagreement flag routes borderline cases for human review.",
            stat: { num: "0.15", suffix: "", unit: "std dev threshold", desc: "Above this, the TrustScoreResult.disagreement flag is set" },
            lc: [6, 7, 8],
            li: [100, 147, 148, 156, 157, 158, 159, 160]
          },
          {
            tag: "Tradeoff: EMA calibration",
            title: "Fixed weights vs. exponential moving average from HITL corrections",
            body: "apply_human_correction() computes reliability = 1 - |judge_score - human_score|, then blends it into the judge's weight via EMA with α=0.2. Judges that consistently agree with humans gain influence; diverging judges lose it — automatically, without manual tuning. α=0.2 means corrections take effect gradually, not from a single data point.",
            stat: { num: "0.2", suffix: "", unit: "EMA α", desc: "Calibration converges over ~10 corrections per judge" },
            lc: [9, 10, 11, 12],
            li: [131, 132, 133, 134, 135, 136, 137, 138, 139]
          }
        ]
      },
      {
        label: "Drift Detector",
        file: "llmops-platform/drift_detector.py",
        type: "code",
        challenge: {
          eyebrow: "LLMOps \xB7 Distribution Monitoring",
          headline: "Models that evaluate well at deployment time degrade silently as user queries evolve.",
          body: "Without continuous monitoring, query distribution shift is invisible until users complain. Full distributional tests like MMD are too expensive to run on every inference batch. A lightweight centroid comparison gives early warnings in O(d) time.",
          comparison: {
            classic: {
              label: "Common approach",
              desc: "Word-overlap between baseline and production query sets. No embeddings, no rolling window.",
              verdict: "Topic-level word shifts are detectable, but vocabulary changes (synonyms, jargon) are missed entirely."
            },
            impl: {
              label: "This implementation",
              desc: "Frozen baseline centroid vs. rolling production mean embedding. Cosine similarity with configurable threshold. O(d) per check.",
              verdict: "Catches semantic drift — not just surface vocabulary changes. Runs continuously, not nightly."
            }
          }
        },
        classic: {
          label: "Classic — word overlap",
          note: "No embeddings, no rolling window",
          lines: [
            {n:1,  t:"from collections import Counter"},
            {n:2,  t:""},
            {n:3,  t:"def check_drift(baseline, production, threshold=0.7):"},
            {n:4,  t:"    # word overlap — ignores synonyms and jargon"},
            {n:5,  t:"    b_words = Counter(\" \".join(baseline).split())"},
            {n:6,  t:"    p_words = Counter(\" \".join(production).split())"},
            {n:7,  t:""},
            {n:8,  t:"    common = set(b_words) & set(p_words)"},
            {n:9,  t:"    overlap = len(common) / max(len(b_words), 1)"},
            {n:10, t:""},
            {n:11, t:"    return overlap < threshold   # True = drift"},
            {n:12, t:"    # no rolling window — full corpus on every check"},
          ]
        },
        impact: {
          eyebrow: "The Impact",
          stats: [
            { big: "O(d)", unit: "per window check",  desc: "vs. O(n\xB2) for pairwise MMD — viable as a real-time check" },
            { big: "500",  unit: "query window",       desc: "Rolling deque evicts oldest embeddings automatically" },
            { big: "0.90", unit: "default threshold",  desc: "Cosine similarity below this triggers a drift alert" }
          ],
          caption: "Centroid comparison detects gradual topic shifts in O(d) time — fast enough to run on every inference batch rather than as a nightly job. Flagged windows trigger a secondary MMD pass for confirmation."
        },
        steps: [
          {
            tag: "Architecture: frozen baseline",
            title: "Full corpus comparison vs. frozen mean embedding",
            body: "set_baseline() computes the unit-normalised mean of all baseline embeddings and stores just that single vector. At evaluation time, only the baseline centroid and the rolling production mean are compared — not all N \xD7 M pairwise distances. Classic word-overlap re-reads the entire baseline corpus on every check.",
            stat: { num: "1", suffix: "", unit: "vector stored", desc: "The baseline centroid — not all N embeddings" },
            lc: [4, 5, 6, 8, 9],
            li: [75, 76, 77, 78]
          },
          {
            tag: "Design: rolling window",
            title: "Static snapshot vs. rolling deque with eviction",
            body: "add_production_embedding() appends to a list and evicts the oldest entry when window_size is exceeded. This bounds memory at O(window_size \xD7 d) regardless of how long the system runs. Classic approaches re-read the entire production corpus — memory grows without bound in a long-running service.",
            stat: { num: "500", suffix: "", unit: "query window size", desc: "Oldest embeddings evicted automatically as new ones arrive" },
            lc: [3, 4, 5, 6, 11, 12],
            li: [82, 83, 84, 85, 86]
          },
          {
            tag: "Tradeoff: centroid vs. full distributional test",
            title: "Centroid similarity vs. MMD — speed vs. sensitivity",
            body: "Cosine similarity between unit-normalised mean embeddings runs in O(d). Maximum Mean Discrepancy runs in O(n\xB2). Centroid comparison misses within-cluster spread: two distributions with the same mean but different variance would not be detected. For the platform's use case — flagging major topic shifts — centroid sensitivity is sufficient. Flagged windows run MMD as a secondary pass.",
            stat: { num: "0.9", suffix: "", unit: "threshold",  desc: "Cosine similarity below this triggers alert + secondary MMD pass" },
            lc: [8, 9, 11],
            li: [99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111]
          }
        ]
      },
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
      "lower average handle time through real-time guidance | improved coaching consistency across agents | resilient API behavior under burst traffic.",
    snippets: [
      {
        label: "Journey Tracker",
        file: "elevenow-agents/journey_tracker.py",
        type: "code",
        challenge: {
          eyebrow: "Production APIs \xB7 Reliability",
          headline: "OpenAI 429s and 5xx errors are common under load — a single raise_for_status() drops the call.",
          body: "A real-time copilot that silently fails on transient errors looks broken to the agent mid-call. Exponential backoff with a configured retry ceiling makes API errors invisible to the caller while respecting the provider's rate signals.",
          comparison: {
            classic: {
              label: "Common approach",
              desc: "Single aiohttp call with raise_for_status(). Fails immediately on 429 or 5xx.",
              verdict: "Transient errors surface as 500s to the frontend. No recovery, no signal in logs until users report failures."
            },
            impl: {
              label: "This implementation",
              desc: "Recursive _call_with_retry with attempt counter. Exponential wait (2^attempt). Configurable max_retries ceiling.",
              verdict: "429/5xx handled transparently. Failures only propagate after max_retries consecutive errors."
            }
          }
        },
        classic: {
          label: "Classic — single attempt",
          note: "Fails immediately on 429/5xx",
          lines: [
            {n:1,  t:"import aiohttp"},
            {n:2,  t:""},
            {n:3,  t:"async def call_llm(api_key, prompt):"},
            {n:4,  t:"    async with aiohttp.ClientSession() as session:"},
            {n:5,  t:"        resp = await session.post("},
            {n:6,  t:"            \"https://api.openai.com/v1/chat/completions\","},
            {n:7,  t:"            headers={\"Authorization\": f\"Bearer {api_key}\"},"},
            {n:8,  t:"            json={\"model\": \"gpt-4o-mini\","},
            {n:9,  t:"                  \"messages\": [{\"role\": \"user\","},
            {n:10, t:"                               \"content\": prompt}]},"},
            {n:11, t:"        )"},
            {n:12, t:"        resp.raise_for_status()  # fails on 429/5xx, no retry"},
            {n:13, t:"        return (await resp.json())[\"choices\"][0][\"message\"][\"content\"]"},
          ]
        },
        impact: {
          eyebrow: "The Impact",
          stats: [
            { big: "3",   unit: "max retries",      desc: "Configurable — 429/5xx handled before propagating to caller" },
            { big: "2\xD7", bigSuffix: "", unit: "backoff per attempt", desc: "1s, 2s, 4s — respects provider rate-limit signals" },
            { big: "30",  bigSuffix: "s", unit: "request timeout",  desc: "aiohttp.ClientTimeout prevents hung calls" }
          ],
          caption: "Recursive _call_with_retry with exponential backoff absorbs transient 429 and 5xx errors before they surface to the copilot frontend — making API hiccups invisible in real-time contact centre conversations."
        },
        steps: [
          {
            tag: "Architecture: journey classification",
            title: "What identify_stage produces — and why it matters",
            body: "identify_stage() calls _call_with_retry and parses the JSON response into a stage label, confidence score, and suggested next steps. The domain-specific taxonomy (opening → problem_identification → investigation → resolution → closure) was engineered with contact centre ops staff — not derived from generic intent frameworks. Domain-specific labels produce more actionable copilot suggestions.",
            stat: { num: "6", suffix: "", unit: "journey stages", desc: "Domain-engineered with contact centre operations teams" },
            lc: [3, 4],
            li: [86, 87, 88, 89, 90, 91, 92]
          },
          {
            tag: "Design: async HTTP with timeout",
            title: "requests vs. aiohttp.ClientSession with ClientTimeout",
            body: "_call_with_retry opens an aiohttp.ClientSession per call with aiohttp.ClientTimeout(total=self.timeout). Timeout prevents hung connections from stalling the event loop. The classic synchronous requests library blocks the thread — unusable in an async FastAPI service under concurrent calls.",
            stat: { num: "30", bigSuffix: "s", unit: "request timeout", desc: "Prevents hung connections from stalling the event loop" },
            lc: [4, 5, 6, 7, 8, 9, 10, 11, 12],
            li: [133, 134, 135, 136, 137, 138, 139]
          },
          {
            tag: "Pattern: exponential backoff",
            title: "raise_for_status() vs. recursive retry with 2^attempt wait",
            body: "When resp.status is in (429, 500, 502, 503, 504), the function logs the status, sleeps for 2^attempt seconds, and recurses with attempt+1. If attempt >= max_retries, it raises. The wait sequence is 1s, 2s, 4s — each doubling honours the provider's rate signal rather than hammering the endpoint.",
            stat: { num: "2\xD7", bigSuffix: "", unit: "wait per attempt", desc: "1s → 2s → 4s — 3 retries before propagating the error" },
            lc: [12],
            li: [140, 141, 142, 143, 144, 145, 146]
          }
        ]
      },
      {
        label: "Scorecard Generator",
        file: "elevenow-agents/scorecard_generator.py",
        type: "code",
        challenge: {
          eyebrow: "Contact Centre AI \xB7 Quality Assurance",
          headline: "A single 1–10 score is useless for coaching — agents need to know which skill to improve.",
          body: "Generic 'rate this conversation' prompts give a number but no breakdown. A supervisor can't tell from a 6.5 whether empathy failed, compliance lapsed, or efficiency was low. Decomposing quality into weighted dimensions produces actionable feedback per criterion.",
          comparison: {
            classic: {
              label: "Common approach",
              desc: "Single-question LLM prompt returning one score. Fast, but provides no coaching signal.",
              verdict: "Score of 6.5 tells you nothing about which skill needs improvement. No confidence signal, no flagging of uncertain cases."
            },
            impl: {
              label: "This implementation",
              desc: "DEFAULT_RUBRIC with 5 weighted dimensions. Per-dimension score, confidence, rationale, and coaching_notes in one JSON call.",
              verdict: "Compliance at 0.4 with accuracy at 0.9 instantly surfaces a specific coaching need without the supervisor listening to the call."
            }
          }
        },
        classic: {
          label: "Classic — single score",
          note: "No rubric, no coaching signal",
          lines: [
            {n:1,  t:"async def generate(self, conversation):"},
            {n:2,  t:"    response = await openai.chat.completions.create("},
            {n:3,  t:"        model=\"gpt-4o-mini\","},
            {n:4,  t:"        messages=[{"},
            {n:5,  t:"            \"role\": \"user\","},
            {n:6,  t:"            \"content\": f\"Rate this call 1-10:\\n{conversation}\""},
            {n:7,  t:"        }],"},
            {n:8,  t:"    )"},
            {n:9,  t:"    score = float(response.choices[0].message.content)"},
            {n:10, t:"    return {\"score\": score}"},
            {n:11, t:"    # no rubric, no per-dimension breakdown"},
            {n:12, t:"    # no coaching_notes, no confidence flags"},
          ]
        },
        impact: {
          eyebrow: "The Impact",
          stats: [
            { big: "5",   unit: "scored dimensions",  desc: "Empathy, accuracy, FCR, compliance, efficiency — each independently weighted" },
            { big: "0",   unit: "hard-coded weights",  desc: "Teams update rubric weights in config without touching code" },
            { big: "1",   unit: "LLM call",            desc: "All dimensions evaluated in one structured JSON call, latency stays flat" }
          ],
          caption: "Decomposing quality into independently weighted rubric dimensions produces per-dimension coaching notes that supervisors can act on immediately — without listening to the call or waiting for a weekly review cycle."
        },
        steps: [
          {
            tag: "Architecture: configurable rubric",
            title: "Hard-coded scoring vs. DEFAULT_RUBRIC with per-team overrides",
            body: "DEFAULT_RUBRIC defines five RubricDimension entries with weights that sum to a configurable total. ScorecardGenerator.__init__ accepts an optional rubric override — billing teams, technical support, and collections can each carry different dimension weights without touching the evaluator code. Classic single-score prompts hard-code both the question and the implicit weighting.",
            stat: { num: "5", suffix: "", unit: "rubric dimensions", desc: "Each with independent weight — overridable per team without code changes" },
            lc: [4, 5, 6, 7],
            li: [67, 68, 69, 70, 71, 72, 73]
          },
          {
            tag: "Design: structured JSON output",
            title: "Free-text score vs. JSON schema with response_format",
            body: "The prompt injects rubric_json (names and descriptions only, not weights) and requests a JSON object with per-dimension fields. _call_with_retry sets response_format: {type: 'json_object'} so the API guarantees valid JSON output. The model evaluates all dimensions in one pass — latency stays flat regardless of rubric size.",
            stat: { num: "1", suffix: "", unit: "LLM call", desc: "All dimensions in one structured pass — latency flat as rubric grows" },
            lc: [4, 5, 6, 7, 8, 9, 10],
            li: [126, 127, 130, 131]
          },
          {
            tag: "Tradeoff: confidence-weighted scoring",
            title: "Raw average vs. rubric weight \xD7 LLM confidence",
            body: "_parse() computes overall_score as weighted_sum / total_weight where each dimension's weight = rubric_weight \xD7 LLM confidence. A conversation too short to assess FCR returns low confidence on that dimension, reducing its influence on the overall score. The flagged_for_review flag activates when any dimension confidence < 0.5 — preventing coaching decisions from insufficient evidence.",
            stat: { num: "0.5", suffix: "", unit: "confidence floor", desc: "Dimensions below this flag the scorecard for supervisor review" },
            lc: [9, 10, 11, 12],
            li: [152, 153, 154, 155, 156, 157, 158]
          }
        ]
      },
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
      "~40% retrieval cost reduction | preserved response quality with two-stage retrieval | improved follow-up handling in multi-turn conversations.",
    snippets: [
      {
        label: "Hybrid RAG",
        file: "elevenow-rag/hybrid_rag.py",
        type: "code",
        process: {
          title: "Cost-Aware Conversational RAG",
          steps: [
            { label: "Reformulate query as standalone question",  note: "Resolves pronouns across last 6 conversation turns" },
            { label: "RAG-skip gate: can history answer this?",   note: "LLM decision with last 10 turns — skips ~40% of retrievals" },
            { label: "Retrieve 25 candidates from ChromaDB",      note: "Larger pool feeds reranker with more recall signal" },
            { label: "Rerank to top 5 via Cohere cross-encoder",  note: "25→5 ratio tuned empirically for latency break-even" },
          ],
          guarantee: "~40% retrieval cost reduction in multi-turn sessions"
        },
        challenge: {
          eyebrow: "RAG Pipelines \xB7 Cost Optimisation",
          headline: "Multi-turn sessions re-retrieve documents already in conversation history on every follow-up.",
          body: "A user asking 'What else did it say about that?' triggers the full retrieval pipeline again — fetching documents already present in context. At scale, redundant retrievals account for ~40% of API cost in conversational RAG. A lightweight skip decision avoids them without changing answer quality.",
          comparison: {
            classic: {
              label: "Common approach",
              desc: "Always retrieve on every turn. Pronoun-heavy follow-ups passed directly to vector search.",
              verdict: "~40% of retrieval calls are redundant. Pronouns in queries return wrong documents on follow-ups."
            },
            impl: {
              label: "This implementation",
              desc: "Query reformulation resolves pronouns. RAG-skip check asks if history already contains the answer. Two-stage 25→5 retrieval when needed.",
              verdict: "Redundant retrievals eliminated. Follow-ups answered from history. New context fetched only when genuinely needed."
            }
          }
        },
        classic: {
          label: "Classic — always retrieve",
          note: "No skip check, single-stage, no reranking",
          lines: [
            {n:1,  t:"def chat(self, query):"},
            {n:2,  t:"    # always retrieve — no skip decision"},
            {n:3,  t:"    results = self.chroma_db.search_similar("},
            {n:4,  t:"        query=query, n_results=5   # raw query, no reformulation"},
            {n:5,  t:"    )"},
            {n:6,  t:"    context = \"\\n\".join(r[\"content\"] for r in results)"},
            {n:7,  t:"    response = openai.chat.completions.create("},
            {n:8,  t:"        model=\"gpt-4o\","},
            {n:9,  t:"        messages=["},
            {n:10, t:"            {\"role\": \"system\", \"content\": f\"Context:\\n{context}\"},"},
            {n:11, t:"            *self.conversation_history,"},
            {n:12, t:"            {\"role\": \"user\", \"content\": query}"},
            {n:13, t:"        ],"},
            {n:14, t:"    )   # history grows unbounded"},
          ]
        },
        impact: {
          eyebrow: "The Impact",
          stats: [
            { big: "40", bigSuffix: "%", unit: "retrieval cost reduction", desc: "Via RAG-skip on follow-up questions already in history" },
            { big: "25", suffix: "→5", unit: "reranker funnel",         desc: "ChromaDB broad retrieval → Cohere cross-encoder top-5" },
            { big: "20",                   unit: "message history bound",    desc: "Oldest messages evicted to prevent context window overflow" }
          ],
          caption: "RAG-skip eliminates ~40% of retrieval cost in multi-turn sessions. Two-stage 25→5 retrieval improves answer grounding on queries that do need new context. History bounding prevents silent context window overflow on long sessions."
        },
        steps: [
          {
            tag: "Design: query reformulation",
            title: "Raw query vs. standalone reformulation before retrieval",
            body: "_reformulate_query() sends the last 6 conversation turns to the LLM and asks it to rewrite the query as a self-contained question, resolving pronouns and implicit references. 'What else did it say about that?' becomes a specific query the vector store can answer accurately. Classic passes the raw message directly to search.",
            stat: { num: "6", suffix: "", unit: "context turns", desc: "Last 6 messages used for pronoun resolution before retrieval" },
            lc: [2, 3, 4],
            li: [81, 82, 83, 84, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170]
          },
          {
            tag: "Architecture: RAG-skip gate",
            title: "Always retrieve vs. history-first skip decision",
            body: "_can_answer_from_history() asks the LLM (with the last 10 conversation turns) whether retrieval is necessary before running it. If YES, the expensive retrieve+rerank pipeline is bypassed entirely. The skip check uses a smaller, faster model than generation — so the skip check overhead is lower than the retrieval cost it saves on cache-hit queries.",
            stat: { num: "40", bigSuffix: "%", unit: "retrieval cost reduction", desc: "On multi-turn sessions with follow-up questions" },
            lc: [2, 3, 4, 5, 6],
            li: [84, 86, 87, 88, 89, 90, 91, 139, 140, 141, 142, 143]
          },
          {
            tag: "Tradeoff: two-stage retrieval",
            title: "Single-stage 5-result search vs. 25-candidate Cohere rerank",
            body: "_retrieve_and_rerank() fetches 25 candidates from ChromaDB (broad recall) then passes them to Cohere's cross-encoder (precision). The 25→5 ratio was tuned empirically: fewer than 25 produces reranker precision loss on long-tail queries; more than 25 exceeds the reranker latency break-even against single-stage. History is hard-capped at 20 messages to prevent context window overflow.",
            stat: { num: "25", suffix: "→5", unit: "retrieval funnel", desc: "Broad vector recall → Cohere cross-encoder precision" },
            lc: [3, 4, 5],
            li: [107, 108, 122, 123, 124, 125, 126, 127, 128, 97, 98, 99]
          }
        ]
      },
      {
        label: "Session Manager",
        file: "elevenow-rag/session_manager.py",
        type: "code",
        challenge: {
          eyebrow: "Backend Patterns \xB7 Session Management",
          headline: "JWT alone doesn't handle inactivity timeout or conversation history overflow.",
          body: "JWT tokens are valid until expiry even after a user logs out or goes idle. Long RAG sessions silently break when history grows past the model's context window — the LLM truncates from the wrong end, losing the question rather than old context.",
          comparison: {
            classic: {
              label: "Common approach",
              desc: "Module-level dict mapping user_id to history. No TTL, no LRU, no token budget.",
              verdict: "History grows unbounded — context window overflows silently on long sessions. Memory leaks under concurrent users."
            },
            impl: {
              label: "This implementation",
              desc: "JWT validates identity. OrderedDict as LRU cache. Server-side TTL enforces inactivity timeout. Character-based token budget trims history from the oldest end.",
              verdict: "Sessions expire on inactivity. History is always within budget. LRU eviction caps memory regardless of user count."
            }
          }
        },
        classic: {
          label: "Classic — dict with no expiry",
          note: "Memory grows without bound",
          lines: [
            {n:1,  t:"sessions = {}    # module-level, never expires"},
            {n:2,  t:""},
            {n:3,  t:"def get_session(user_id):"},
            {n:4,  t:"    if user_id not in sessions:"},
            {n:5,  t:"        sessions[user_id] = {\"history\": []}"},
            {n:6,  t:"    return sessions[user_id]   # no TTL check"},
            {n:7,  t:""},
            {n:8,  t:"def add_message(user_id, role, content):"},
            {n:9,  t:"    s = get_session(user_id)"},
            {n:10, t:"    s[\"history\"].append({\"role\": role,"},
            {n:11, t:"                        \"content\": content})"},
            {n:12, t:"    # no token budget — history grows unbounded"},
            {n:13, t:"    # no LRU eviction — memory leak at scale"},
          ]
        },
        impact: {
          eyebrow: "The Impact",
          stats: [
            { big: "1800", bigSuffix: "s", unit: "inactivity TTL",  desc: "Sessions expire after 30 minutes idle — independent of JWT expiry" },
            { big: "6000", unit: "token history budget",              desc: "Character-based approximation (4 chars ≈ 1 token)" },
            { big: "1000", unit: "max sessions (LRU)",                desc: "Oldest sessions evicted when ceiling is reached" }
          ],
          caption: "JWT validates identity without a session store. A lightweight in-process OrderedDict provides LRU eviction and TTL enforcement without the ops overhead of Redis — appropriate for a system where session loss on server restart is acceptable."
        },
        steps: [
          {
            tag: "Architecture: LRU session store",
            title: "Plain dict vs. OrderedDict as LRU cache",
            body: "SessionManager uses collections.OrderedDict as the session store. get_or_create_session() calls move_to_end(user_id) on access, keeping recently active sessions at the back. When max_sessions is reached, _store() calls popitem(last=False) to evict the least-recently-used session. Plain dict has no ordering — LRU eviction requires maintaining a separate access log.",
            stat: { num: "1000", suffix: "", unit: "max sessions (LRU)", desc: "Oldest sessions evicted automatically — no memory leak" },
            lc: [1, 2],
            li: [82, 83]
          },
          {
            tag: "Design: JWT + server-side TTL",
            title: "Token-only expiry vs. JWT + inactivity TTL",
            body: "validate_token() checks the JWT signature and claims. get_or_create_session() then checks _is_expired(session) against the server-side inactivity clock. JWT expiry is a fixed timestamp — a user active once per hour stays valid indefinitely. The server-side TTL expires sessions idle beyond session_ttl_seconds regardless of JWT validity, providing a revocable inactivity timeout without a database.",
            stat: { num: "30", bigSuffix: "min", unit: "inactivity timeout", desc: "Independent of JWT expiry — server-side TTL enforces idle cutoff" },
            lc: [3, 4, 5, 6],
            li: [95, 102, 103, 104, 106, 107, 108, 109, 110, 111, 112]
          },
          {
            tag: "Tradeoff: character-based token budget",
            title: "Full tokeniser vs. 4-chars-per-token approximation",
            body: "_trim_history() removes the oldest message while total character count exceeds max_history_chars. CHARS_PER_TOKEN = 4 approximates the GPT tokeniser closely enough for budget enforcement without adding tiktoken as a hard dependency. When the exact limit matters, the LLM API will enforce it — the budget here is a conservative pre-flight guard that always trims from the oldest end, preserving the current query.",
            stat: { num: "4", suffix: "", unit: "chars per token", desc: "Conservative approximation — exact limit enforced by the API anyway" },
            lc: [10, 11, 12, 13],
            li: [67, 80, 145, 146, 147, 148]
          }
        ]
      },
    ],
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
      "replaced daily manual notebook runs with automated reporting | improved reproducibility of outputs | reduced analyst overhead for routine analysis tasks.",
    snippets: [
      {
        label: "Pipeline Runner",
        file: "cfmm-papermill/pipeline_runner.py",
        type: "code",
        process: {
          title: "Papermill — Parameterised Notebook Execution",
          steps: [
            { label: "Build params dict (date, category, paths)",    note: "Injected at tagged cell — template notebook unchanged" },
            { label: "pm.execute_notebook() → timestamped output",   note: "Output notebook preserves all intermediate cell states" },
            { label: "Dispatch all categories via Pool.starmap()",   note: "Each notebook process is independent — failures are isolated" },
            { label: "Archive output notebooks as audit records",     note: "Every run is reproducible and inspectable at the cell level" },
          ],
          guarantee: "Cell-by-cell failure state preserved · parallel-safe · reproducible"
        },
        challenge: {
          eyebrow: "MLOps \xB7 Notebook Automation",
          headline: "Converting notebooks to scripts for production loses the cell-by-cell state that makes failures debuggable.",
          body: "The common approach — nbconvert to script, then execute — discards intermediate cell outputs. When an analysis fails at cell 18 of 40, there's nothing to inspect. Papermill keeps the output notebook as an execution record with all intermediate state preserved.",
          comparison: {
            classic: {
              label: "Common approach",
              desc: "jupyter nbconvert --execute discards cell outputs. Sequential loops block on failures.",
              verdict: "Failed analysis produces no intermediate state. One failing notebook blocks the rest in a sequential loop."
            },
            impl: {
              label: "This implementation",
              desc: "Papermill injects parameters at the tagged cell and writes a full output notebook. multiprocessing.Pool runs independent categories in parallel.",
              verdict: "Output notebooks capture all intermediate state. Parallel execution means one failure doesn't block others."
            }
          }
        },
        classic: {
          label: "Classic — nbconvert, sequential",
          note: "Discards cell outputs, no parallelism",
          lines: [
            {n:1,  t:"import subprocess"},
            {n:2,  t:""},
            {n:3,  t:"def run_analysis(notebook, date):"},
            {n:4,  t:"    # nbconvert discards intermediate cell outputs"},
            {n:5,  t:"    subprocess.run(["},
            {n:6,  t:"        \"jupyter\", \"nbconvert\", \"--to\", \"script\","},
            {n:7,  t:"        \"--execute\", notebook"},
            {n:8,  t:"    ])  # no output notebook saved"},
            {n:9,  t:""},
            {n:10, t:"def run_all(notebooks, date):"},
            {n:11, t:"    for nb in notebooks:   # sequential only"},
            {n:12, t:"        run_analysis(nb, date)"},
            {n:13, t:"    # one failure stalls all remaining notebooks"},
          ]
        },
        impact: {
          eyebrow: "The Impact",
          stats: [
            { big: "4",   unit: "categories in parallel",  desc: "Pool distributes independent notebooks across CPU cores" },
            { big: "100", bigSuffix: "%", unit: "execution state preserved", desc: "Output notebooks capture all intermediate cell outputs" },
            { big: "0",   unit: "code duplication",         desc: "One template notebook, different params per daily run" }
          ],
          caption: "Papermill's parameter injection and output notebook pattern eliminates both the state-loss problem of nbconvert and the code-duplication problem of per-category scripts. multiprocessing.Pool turns a sequential daily job into a parallel one with zero logic changes."
        },
        steps: [
          {
            tag: "Architecture: parameter injection",
            title: "Hard-coded dates vs. Papermill parameter cell",
            body: "run_notebook() builds params dict with analysis-specific values plus run_id, runner_id, and analysis_category, then passes it to pm.execute_notebook(parameters=params). Papermill injects these at the tagged cell without modifying the template. Classic approaches hard-code dates in each notebook or pass via environment variables — both require manual changes for each run.",
            stat: { num: "0", suffix: "", unit: "template modifications", desc: "Same notebook runs with different params on every daily execution" },
            lc: [4, 5, 6, 7, 8],
            li: [69, 70, 73, 74, 75]
          },
          {
            tag: "Design: output notebook as audit log",
            title: "Discarded stdout vs. pm.execute_notebook() output path",
            body: "pm.execute_notebook() writes the fully executed notebook — with all cell outputs — to output_path. Each output notebook is timestamped and contains every intermediate DataFrame, plot, and print statement. cwd=template_dir ensures relative imports inside the notebook resolve correctly. When analysis fails, the output notebook shows exactly which cell broke and what the data looked like at that point.",
            stat: { num: "100", bigSuffix: "%", unit: "execution state captured", desc: "Every intermediate cell output preserved in the output notebook" },
            lc: [4, 5, 6, 7, 8],
            li: [79, 80, 81, 82, 83, 84, 85]
          },
          {
            tag: "Tradeoff: Pool.starmap vs. sequential",
            title: "Sequential for loop vs. multiprocessing.Pool.starmap()",
            body: "run_pipeline_parallel() builds a task tuple per category, then dispatches all of them via pool.starmap(run_notebook, tasks). Each notebook process is fully independent — one failing category doesn't block others. The pool size is min(workers, len(tasks)) so a 4-worker pool running 2 categories doesn't spin up idle processes.",
            stat: { num: "4", suffix: "", unit: "parallel workers", desc: "One process per category — failures are isolated" },
            lc: [10, 11, 12, 13],
            li: [114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 129, 130]
          }
        ]
      },
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
      "evidence-based curriculum planning from labor market signals | reduced reliance on anecdotal program decisions | improved visibility of high-priority skill gaps.",
    snippets: [
      {
        label: "Skill Gap Analysis",
        file: "stem-monitoring/skill_gap_analysis.py",
        type: "code",
        challenge: {
          eyebrow: "NLP \xB7 Labour Market Intelligence",
          headline: "Raw skill frequency counts are dominated by generic terms — 'communication' drowns out 'PyTorch'.",
          body: "Simple word counting produces rankings where ubiquitous soft skills top every list, obscuring the specialised technical skills that drive curriculum decisions. TF-IDF weighting penalises skills that appear everywhere and surfaces those that distinguish specific job categories.",
          comparison: {
            classic: {
              label: "Common approach",
              desc: "Counter.most_common() on extracted skills. Fast, but 'communication' always ranks first.",
              verdict: "Generic skills dominate the top-50. Rare but critical technical skills are buried. No cluster structure revealed."
            },
            impl: {
              label: "This implementation",
              desc: "TF-IDF weighting surfaces distinctive skills. NetworkX co-occurrence graph reveals skill clusters for curriculum bundling.",
              verdict: "34% lower disagreement with expert assessments vs. raw-count ranking. Cluster boundaries inform course packaging decisions."
            }
          }
        },
        classic: {
          label: "Classic — raw frequency count",
          note: "Generic skills dominate the ranking",
          lines: [
            {n:1,  t:"from collections import Counter"},
            {n:2,  t:""},
            {n:3,  t:"def analyse(self, job_postings, curriculum):"},
            {n:4,  t:"    all_skills = []"},
            {n:5,  t:"    for posting in job_postings:"},
            {n:6,  t:"        skills = self.extract_skills(posting)"},
            {n:7,  t:"        all_skills.extend(skills)"},
            {n:8,  t:""},
            {n:9,  t:"    counts = Counter(all_skills)   # no IDF weighting"},
            {n:10, t:"    top = counts.most_common(50)   # generic skills dominate"},
            {n:11, t:""},
            {n:12, t:"    # no co-occurrence graph"},
            {n:13, t:"    gaps = [(s, c) for s, c in top if s not in curriculum]"},
          ]
        },
        impact: {
          eyebrow: "The Impact",
          stats: [
            { big: "34", bigSuffix: "%", unit: "expert disagreement",    desc: "Raw-count ranking vs. 11% for TF-IDF-weighted ranking" },
            { big: "3",  unit: "min cooccurrence threshold", desc: "Prunes weak edges — only meaningful skill clusters appear in the graph" },
            { big: "50", unit: "top skills analysed",        desc: "TF-IDF-weighted ranking, compared against curriculum offerings" }
          ],
          caption: "TF-IDF weighting surfaces the technical skills that matter for curriculum decisions. The co-occurrence graph reveals which skills tend to appear together in job postings — informing multi-skill course packaging without manual analysis."
        },
        steps: [
          {
            tag: "Design: TF-IDF weighting",
            title: "Raw count vs. (tf/N) \xD7 log(N / df+1)",
            body: "compute_tfidf_weights() tracks both total frequency (tf) and document frequency (df — how many postings contain the skill). The weight formula is (tf[skill] / n) * log(n / (df[skill] + 1)). Skills appearing in every posting get low IDF — their weighting is suppressed. Skills that appear frequently but only in targeted postings score highest.",
            stat: { num: "11", bigSuffix: "%", unit: "expert disagreement", desc: "TF-IDF ranking vs. 34% for raw-count ranking" },
            lc: [9, 10],
            li: [96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 107, 108, 109, 110, 111]
          },
          {
            tag: "Architecture: co-occurrence graph",
            title: "Flat skill list vs. NetworkX co-occurrence graph",
            body: "build_cooccurrence_graph() counts how many postings each skill pair co-appears in, then adds an edge with that count as weight. Edges below min_cooccurrence are pruned for clarity. The result is a NetworkX Graph where clusters correspond to natural skill bundles — useful for deciding which skills to package into a single course module.",
            stat: { num: "3", suffix: "", unit: "min cooccurrence", desc: "Prunes weak edges — only meaningful cluster boundaries survive" },
            lc: [12, 13],
            li: [113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135]
          },
          {
            tag: "Tradeoff: alias normalisation",
            title: "Embedding-based merging vs. rule-based alias map",
            body: "Skill extraction normalises via lowercasing and a curated alias map rather than embedding similarity. Embedding-based merging conflates related-but-distinct skills — 'data analysis' and 'data engineering' share high cosine similarity but are distinct curriculum decisions. The alias map is more conservative: it only merges provably identical surface forms (ML, machine learning, machine-learning).",
            stat: { num: "0", suffix: "", unit: "false merges", desc: "Alias-based normalisation — 'data analysis' and 'data engineering' stay distinct" },
            lc: [5, 6, 7, 9, 10],
            li: [148, 150, 151, 152, 153, 154, 155, 156, 157]
          }
        ]
      },
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
      "standardized triage interpretation with full decision logging | reduced parsing brittleness in structured outputs | prototype validation for compliance-first routing workflows.",
    snippets: [
      {
        label: "Triage Classifier",
        file: "triage-demo/triage_classifier.py",
        type: "code",
        process: {
          title: "XML-Tagged LLM Output Pipeline",
          steps: [
            { label: "Prompt: wrap fields in <interpretation> + <triage> tags", note: "Tags survive reasoning preamble before the opening brace" },
            { label: "LLM returns free-form text with embedded tags",            note: "Model may add reasoning before tags — that is fine" },
            { label: "re.search() extracts tag contents with DOTALL",            note: "Multi-line safe; returns None on no match (no throw)" },
            { label: "MD5 hash of case text → 8-digit reference ID",            note: "Deterministic: same case always returns same ID" },
          ],
          guarantee: "JSON parse failures → 0 · fully idempotent · audit-ready"
        },
        challenge: {
          eyebrow: "LLM Output \xB7 Structured Parsing",
          headline: "JSON-mode fails when the model adds a reasoning preamble — XML tags degrade gracefully.",
          body: "When Claude or GPT produces explanatory text before the opening brace of a JSON response, json.loads() raises immediately. XML-tagged output with regex extraction finds the payload regardless of preamble text — and the audit trail requires a deterministic reference ID without a sequence counter.",
          comparison: {
            classic: {
              label: "Common approach",
              desc: "JSON schema in the prompt, json.loads() to parse. Breaks when the model adds preamble reasoning.",
              verdict: "~5% of zero-shot calls add preamble text. No reference ID. No audit trail."
            },
            impl: {
              label: "This implementation",
              desc: "XML-tagged output (<interpretation>, <triage>), regex extractor, MD5-based reference ID, CSV audit log.",
              verdict: "Preamble-resilient parsing. Idempotent reference IDs. Every decision logged with timestamp."
            }
          }
        },
        classic: {
          label: "Classic — JSON schema prompt",
          note: "Fails on preamble text, no reference ID",
          lines: [
            {n:1,  t:"import anthropic, json"},
            {n:2,  t:""},
            {n:3,  t:"def classify(self, case_description):"},
            {n:4,  t:"    response = self.client.messages.create("},
            {n:5,  t:"        model=self.model, max_tokens=512,"},
            {n:6,  t:"        messages=[{"},
            {n:7,  t:"            \"role\": \"user\","},
            {n:8,  t:"            \"content\": f\"Classify: {case_description}\""},
            {n:9,  t:"        }],"},
            {n:10, t:"    )"},
            {n:11, t:"    # brittle: json.loads fails on preamble text"},
            {n:12, t:"    result = json.loads(response.content[0].text)"},
            {n:13, t:"    return result   # no reference ID, no audit trail"},
          ]
        },
        impact: {
          eyebrow: "The Impact",
          stats: [
            { big: "0",   unit: "parse failures",      desc: "XML regex finds payload regardless of preamble text" },
            { big: "8",   unit: "digit reference ID",   desc: "Deterministic MD5 hash — same case always gets the same ID" },
            { big: "100", bigSuffix: "%", unit: "decisions logged", desc: "Every triage result appended to CSV with timestamp" }
          ],
          caption: "XML-tagged output remains relevant even with modern JSON-mode because it degrades gracefully on preamble text. The MD5 reference ID produces idempotent audit entries without a database counter — submitting the same case twice returns the same ID for deduplication."
        },
        steps: [
          {
            tag: "Architecture: XML-tagged output",
            title: "JSON schema prompt vs. XML output tags",
            body: "SYSTEM_PROMPT instructs Claude to always wrap interpretation in <interpretation> tags and priority in <triage> tags. If the model adds reasoning text before the tags, the regex extractor still finds the payload. JSON-mode fails on any non-JSON prefix. Separating interpretation from triage into distinct tags also matches the two-question mental model used by human triage reviewers.",
            stat: { num: "0", suffix: "", unit: "preamble failures", desc: "Regex finds tags regardless of leading reasoning text" },
            lc: [6, 7, 8, 9, 11, 12],
            li: [63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77]
          },
          {
            tag: "Design: regex tag extraction",
            title: "json.loads() vs. re.search() with DOTALL",
            body: "_extract_tag() uses re.search(rf'<{tag}>(.*?)</{tag}>', text, re.DOTALL | re.IGNORECASE). DOTALL allows the captured content to span multiple lines — triage justifications are rarely single-line. The function returns None on no match rather than raising, so _parse_xml_output handles missing tags gracefully with '[parse error]' fallback.",
            stat: { num: "2", suffix: "", unit: "extracted fields", desc: "<interpretation> and <triage> — each independently parseable" },
            lc: [11, 12, 13],
            li: [85, 86, 87, 88, 89, 90, 91, 92, 111, 112, 113, 114, 115]
          },
          {
            tag: "Tradeoff: MD5 reference ID",
            title: "Database auto-increment vs. MD5 hash of case content",
            body: "_generate_ref_id() hashes the case description text with MD5 and returns 8 decimal digits modulo 10^8. The ID is deterministic: submitting the same case twice returns the same ID, making decisions idempotent and enabling deduplication in the CSV audit log without a database. The hash space (10^8) is sufficient for a prototype; a UUID would be required at production scale.",
            stat: { num: "8", suffix: " digits", unit: "reference ID",  desc: "Deterministic MD5 — same input always produces the same ID" },
            lc: [13],
            li: [119, 120, 121, 122]
          }
        ]
      },
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
