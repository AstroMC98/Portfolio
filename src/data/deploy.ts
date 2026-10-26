/** The forward-deployed playbook — each stage links to case files that evidence it. */
export const PLAYBOOK = [
  {
    n: '01',
    stage: 'Discover',
    what: 'Sit with the team that owns the process. Map the workflow, the data, and the constraints nobody wrote down — residency, access, spend.',
    artifact: 'Constraint map',
    proof: [
      { id: 'local-rag', label: 'Data residency → fully offline RAG' },
      { id: 'enterprise-rag-chat', label: 'Access + spend → RBAC and credit limits' },
    ],
  },
  {
    n: '02',
    stage: 'Scope',
    what: 'Cut the ask down to the narrowest MVP that moves a number the business already tracks.',
    artifact: 'One-page scope + success metric',
    proof: [
      { id: 'hybrid-rag', label: 'Retrieval cost → ~40% lower' },
      { id: 'triage-demo', label: 'Prototype first, clearly labelled' },
    ],
  },
  {
    n: '03',
    stage: 'Ship',
    what: 'Production on the client’s stack — their cloud, their identity provider, their network — not a demo on mine.',
    artifact: 'Deployed service + IaC',
    proof: [
      { id: 'enterprise-rag-chat', label: 'Azure Container Apps + Bicep' },
      { id: 'local-rag', label: 'On-prem, air-gapped desktop' },
    ],
  },
  {
    n: '04',
    stage: 'Harden',
    what: 'Rate limits, retries, evaluations, drift checks and audit trails — before anyone calls it done.',
    artifact: 'Hardening log + eval suite',
    proof: [
      { id: 'document-intelligence', label: 'Burst-safe rate limiting' },
      { id: 'llmops-platform', label: 'Ensemble evals + drift detection' },
    ],
  },
  {
    n: '05',
    stage: 'Hand over',
    what: 'Runbooks, training and dashboards so teams without ML engineers can operate and trust it.',
    artifact: 'Runbook, dashboard, training',
    proof: [
      { id: 'stem-monitoring', label: 'Dashboards for non-technical owners' },
      { id: 'media-analysis', label: 'Reproducible daily runs' },
    ],
  },
];

/** Systems AI has been wired into, grouped by integration surface. */
export const INTEGRATIONS = [
  {
    group: 'Identity & access',
    items: [
      { name: 'Azure AD · RBAC', ids: ['enterprise-rag-chat'] },
      { name: 'JWT sessions + TTL', ids: ['hybrid-rag'] },
      { name: 'Per-user credit limits', ids: ['enterprise-rag-chat'] },
    ],
  },
  {
    group: 'Data, search & storage',
    items: [
      { name: 'Azure AI Search', ids: ['enterprise-rag-chat'] },
      { name: 'CosmosDB', ids: ['enterprise-rag-chat'] },
      { name: 'PostgreSQL + pgvector', ids: ['llmops-platform'] },
      { name: 'ChromaDB', ids: ['local-rag', 'hybrid-rag', 'document-intelligence'] },
      { name: 'DVC-versioned datasets', ids: ['local-rag', 'llmops-platform'] },
    ],
  },
  {
    group: 'Runtime & infrastructure',
    items: [
      { name: 'Azure Container Apps', ids: ['enterprise-rag-chat'] },
      { name: 'Bicep IaC', ids: ['enterprise-rag-chat'] },
      { name: 'Docker', ids: ['local-rag', 'llmops-platform'] },
      { name: 'Air-gapped · Ollama on CUDA/Metal', ids: ['local-rag'] },
    ],
  },
  {
    group: 'Services & orchestration',
    items: [
      { name: 'FastAPI · Quart (async)', ids: ['agent-copilot', 'enterprise-rag-chat', 'local-rag'] },
      { name: 'Laravel API ↔ Python engine', ids: ['llmops-platform'] },
      { name: 'Papermill · multiprocessing', ids: ['media-analysis'] },
      { name: 'n8n · Zapier automations', ids: [] },
    ],
  },
  {
    group: 'Interfaces',
    items: [
      { name: 'React + TypeScript', ids: ['local-rag'] },
      { name: 'React + Fluent UI', ids: ['enterprise-rag-chat'] },
      { name: 'Streamlit', ids: ['stem-monitoring', 'triage-demo'] },
    ],
  },
];

/** Sectors delivered into, from the experience record. */
export const SECTORS = ['Insurance', 'BPO / customer service', 'Media monitoring', 'Travel', 'Education', 'Public health & government', 'Genomics research'];
