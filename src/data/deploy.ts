/** The forward-deployed playbook — each stage links to case files that evidence it. */
export const PLAYBOOK = [
  {
    n: '01',
    stage: 'Discover',
    what: 'Sit with the team that owns the process. Map the workflow, the data, and the constraints nobody wrote down — residency, access, spend.',
    artifact: 'Constraint map',
    proof: [
      { id: 'daiso', label: 'Data residency → fully offline RAG' },
      { id: 'wfgpt-prod', label: 'Access + spend → RBAC and credit limits' },
    ],
  },
  {
    n: '02',
    stage: 'Scope',
    what: 'Cut the ask down to the narrowest MVP that moves a number the business already tracks.',
    artifact: 'One-page scope + success metric',
    proof: [
      { id: 'elevenow-rag', label: 'Retrieval cost → ~40% lower' },
      { id: 'triage-demo', label: 'Prototype first, clearly labelled' },
    ],
  },
  {
    n: '03',
    stage: 'Ship',
    what: 'Production on the client’s stack — their cloud, their identity provider, their network — not a demo on mine.',
    artifact: 'Deployed service + IaC',
    proof: [
      { id: 'wfgpt-prod', label: 'Azure Container Apps + Bicep' },
      { id: 'daiso', label: 'On-prem, air-gapped desktop' },
    ],
  },
  {
    n: '04',
    stage: 'Harden',
    what: 'Rate limits, retries, evaluations, drift checks and audit trails — before anyone calls it done.',
    artifact: 'Hardening log + eval suite',
    proof: [
      { id: 'd2lt-enhanced', label: 'Burst-safe rate limiting' },
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
      { id: 'cfmm-papermill', label: 'Reproducible daily runs' },
    ],
  },
];

/** Systems AI has been wired into, grouped by integration surface. */
export const INTEGRATIONS = [
  {
    group: 'Identity & access',
    items: [
      { name: 'Azure AD · RBAC', ids: ['wfgpt-prod'] },
      { name: 'JWT sessions + TTL', ids: ['elevenow-rag'] },
      { name: 'Per-user credit limits', ids: ['wfgpt-prod'] },
    ],
  },
  {
    group: 'Data, search & storage',
    items: [
      { name: 'Azure AI Search', ids: ['wfgpt-prod'] },
      { name: 'CosmosDB', ids: ['wfgpt-prod'] },
      { name: 'PostgreSQL + pgvector', ids: ['llmops-platform'] },
      { name: 'ChromaDB', ids: ['daiso', 'elevenow-rag', 'd2lt-enhanced'] },
      { name: 'DVC-versioned datasets', ids: ['daiso', 'llmops-platform'] },
    ],
  },
  {
    group: 'Runtime & infrastructure',
    items: [
      { name: 'Azure Container Apps', ids: ['wfgpt-prod'] },
      { name: 'Bicep IaC', ids: ['wfgpt-prod'] },
      { name: 'Docker', ids: ['daiso', 'llmops-platform'] },
      { name: 'Air-gapped · Ollama on CUDA/Metal', ids: ['daiso'] },
    ],
  },
  {
    group: 'Services & orchestration',
    items: [
      { name: 'FastAPI · Quart (async)', ids: ['elevenow-agents', 'wfgpt-prod', 'daiso'] },
      { name: 'Laravel API ↔ Python engine', ids: ['llmops-platform'] },
      { name: 'Papermill · multiprocessing', ids: ['cfmm-papermill'] },
      { name: 'n8n · Zapier automations', ids: [] },
    ],
  },
  {
    group: 'Interfaces',
    items: [
      { name: 'React + TypeScript', ids: ['daiso'] },
      { name: 'React + Fluent UI', ids: ['wfgpt-prod'] },
      { name: 'Streamlit', ids: ['stem-monitoring', 'triage-demo'] },
    ],
  },
];

/** Sectors delivered into, from the experience record. */
export const SECTORS = ['Insurance', 'BPO / customer service', 'Media monitoring', 'Travel', 'Education', 'Public health & government', 'Genomics research'];
