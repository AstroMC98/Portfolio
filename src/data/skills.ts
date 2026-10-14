/** Capability stack — drawn as layers of an AI system, top (closest to the user) to bottom. */
export const STACK = [
  {
    id: 'models',
    layer: 'L5',
    name: 'Models & GenAI',
    blurb: 'Choosing, prompting and adapting the model for the job.',
    items: ['GPT-4o / o1', 'Anthropic Claude', 'Google Gemini', 'Azure OpenAI', 'Ollama · local LLMs', 'Hugging Face', 'LoRA fine-tuning', 'Prompt engineering', 'Stable Diffusion'],
    projects: ['d2lt-enhanced', 'daiso', 'wfgpt-prod', 'llmops-platform', 'elevenow-agents', 'elevenow-rag', 'triage-demo'],
  },
  {
    id: 'retrieval',
    layer: 'L4',
    name: 'Retrieval & Knowledge',
    blurb: 'Grounding answers in an organisation’s own documents.',
    items: ['RAG · Agentic RAG', 'Azure AI Search', 'Hybrid / semantic search', 'Cohere Rerank', 'ChromaDB · vector DBs', 'LlamaIndex', 'LangChain', 'OCR · Document AI'],
    projects: ['d2lt-enhanced', 'daiso', 'wfgpt-prod', 'elevenow-rag'],
  },
  {
    id: 'orchestration',
    layer: 'L3',
    name: 'Agents & Orchestration',
    blurb: 'Multi-step pipelines, tools and the APIs that serve them.',
    items: ['Multi-agent systems', 'Tool use · function calling', 'MCP servers', 'FastAPI · Quart · Flask', 'Async Python', 'Pydantic', 'n8n · Zapier', 'Laravel · Node.js'],
    projects: ['d2lt-enhanced', 'wfgpt-prod', 'llmops-platform', 'elevenow-agents', 'cfmm-papermill', 'triage-demo'],
  },
  {
    id: 'data',
    layer: 'L2',
    name: 'Data & Machine Learning',
    blurb: 'Classical ML, NLP and the data underneath it.',
    items: ['PyTorch', 'scikit-learn', 'XGBoost · LightGBM', 'Time-series forecasting', 'NLP', 'Computer vision', 'PostgreSQL · DuckDB', 'CosmosDB · Redis', 'Pandas · NetworkX'],
    projects: ['stem-monitoring', 'cfmm-papermill', 'llmops-platform', 'wfgpt-prod'],
  },
  {
    id: 'platform',
    layer: 'L1',
    name: 'Platform & LLMOps',
    blurb: 'Shipping it, governing it, and knowing when it drifts.',
    items: ['Azure · AI Foundry · Container Apps', 'GCP Vertex AI', 'AWS', 'Azure AD · RBAC', 'Bicep IaC', 'Docker', 'GitHub Actions', 'MLflow · DVC', 'Evidently AI · W&B'],
    projects: ['daiso', 'wfgpt-prod', 'llmops-platform'],
  },
];

export const TOOLING = ['Claude Code', 'Cursor', 'GitHub Copilot', 'Streamlit', 'Power BI', 'Tableau', 'Plotly', 'Jupyter · Papermill'];
