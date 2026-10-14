/**
 * Presentation metadata layered on top of projects.ts.
 * `kpiVerified: false` marks a businessKpi that originated as draft copy in
 * references/suggestions_caseStudies.md — those never get numeral treatment and
 * the modal falls back to the qualitative impact line.
 */
export type Tag = 'RAG' | 'Agents' | 'LLMOps' | 'Analytics';

export interface DiagramNode {
  id: string;
  x: number;
  y: number;
  label: string;
  sub?: string;
  accent?: boolean;
  shape?: 'rect' | 'diamond';
  w?: number;
}
export interface DiagramZone {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}
export interface Diagram {
  viewBox: string;
  zones?: DiagramZone[];
  nodes: DiagramNode[];
  edges: [string, string, string?][]; // from, to, optional edge label
  live: [string, string][]; // edges that carry animated packets
  caption: string;
}

export interface CaseMeta {
  featured: boolean;
  tags: Tag[];
  kpiVerified: boolean;
  headline: { prefix?: string; value: string; suffix?: string; label: string };
  role: string;
  diagram?: Diagram;
}

export const CASE_META: Record<string, CaseMeta> = {
  'd2lt-enhanced': {
    featured: true,
    tags: ['Agents'],
    kpiVerified: true,
    headline: { prefix: '10–', value: '30', suffix: '×', label: 'document throughput — hours of turnaround down to minutes' },
    role: 'Lead AI engineer · architecture + async pipeline',
    diagram: {
      viewBox: '0 0 680 360',
      caption: 'Map-reduce over agents: one Architect plans, a Specialist pool extracts in parallel, a Builder assembles, a Verifier gates quality.',
      nodes: [
        { id: 'in', x: 56, y: 180, label: 'PDF batch', sub: 'multi-page', w: 92 },
        { id: 'arch', x: 190, y: 180, label: 'Architect', sub: 'layout analysis', accent: true },
        { id: 's1', x: 345, y: 80, label: 'Specialist', sub: 'region · async' },
        { id: 's2', x: 345, y: 180, label: 'Specialist', sub: 'region · async' },
        { id: 's3', x: 345, y: 280, label: 'Specialist', sub: 'region · async' },
        { id: 'build', x: 495, y: 180, label: 'Builder', sub: 'semantic HTML' },
        { id: 'ver', x: 620, y: 180, label: 'Verifier', sub: 'quality gate', accent: true, w: 96 },
      ],
      edges: [['in', 'arch'], ['arch', 's1'], ['arch', 's2'], ['arch', 's3'], ['s1', 'build'], ['s2', 'build'], ['s3', 'build'], ['build', 'ver']],
      live: [['arch', 's1'], ['arch', 's3'], ['s2', 'build'], ['build', 'ver'], ['in', 'arch']],
    },
  },
  'wfgpt-prod': {
    featured: true,
    tags: ['RAG'],
    kpiVerified: false, // TODO(confirm): "Time-to-answer reduced by ~45%" is draft copy
    headline: { value: '3', label: 'interchangeable retrieval strategies behind one governed, RBAC-gated platform' },
    role: 'Lead engineer · platform architecture + governance',
    diagram: {
      viewBox: '0 0 680 360',
      caption: 'Every request passes an identity + credit gate, gets rewritten, then fans out to a pluggable retrieval approach before grounded generation.',
      nodes: [
        { id: 'user', x: 56, y: 180, label: 'User', sub: 'Azure AD', w: 88 },
        { id: 'gate', x: 180, y: 180, label: 'RBAC gate', sub: 'credit limits', accent: true, shape: 'diamond', w: 136 },
        { id: 'rw', x: 312, y: 180, label: 'Rewrite', sub: 'query planner' },
        { id: 'sem', x: 450, y: 80, label: 'Semantic', sub: 'AI Search' },
        { id: 'vec', x: 450, y: 180, label: 'Vector', sub: 'AI Search' },
        { id: 'hyb', x: 450, y: 280, label: 'Hybrid', sub: 'AI Search' },
        { id: 'ans', x: 600, y: 180, label: 'GPT-4o', sub: '+ GPT-4V vision', accent: true, w: 104 },
      ],
      edges: [['user', 'gate'], ['gate', 'rw'], ['rw', 'sem'], ['rw', 'vec'], ['rw', 'hyb'], ['sem', 'ans'], ['vec', 'ans'], ['hyb', 'ans']],
      live: [['user', 'gate'], ['gate', 'rw'], ['rw', 'hyb'], ['hyb', 'ans']],
    },
  },
  'llmops-platform': {
    featured: true,
    tags: ['LLMOps', 'Agents'],
    kpiVerified: false, // TODO(confirm): "Evaluation cycle reduced to ~12 minutes" is draft copy
    headline: { value: '0', label: 'redeploys to change an evaluator — configs live in the database, code lives in git' },
    role: 'Lead engineer · evaluation architecture + scoring',
    diagram: {
      viewBox: '0 0 680 360',
      caption: 'Agentic judges critique before they score; an ensemble weights them by confidence, and drift checks watch production.',
      nodes: [
        { id: 'cfg', x: 60, y: 180, label: 'Config DB', sub: 'Laravel API', w: 96 },
        { id: 'eng', x: 195, y: 180, label: 'Eval engine', sub: 'FastAPI', accent: true },
        { id: 'j1', x: 340, y: 80, label: 'Judge', sub: 'persona A' },
        { id: 'j2', x: 340, y: 180, label: 'Judge', sub: 'persona B' },
        { id: 'j3', x: 340, y: 280, label: 'Judge', sub: 'persona C' },
        { id: 'ens', x: 485, y: 180, label: 'Ensemble', sub: 'Trust Score', accent: true },
        { id: 'drift', x: 615, y: 110, label: 'Drift', sub: 'monitor', w: 90 },
        { id: 'ml', x: 615, y: 250, label: 'MLflow', sub: 'DVC datasets', w: 90 },
      ],
      edges: [['cfg', 'eng'], ['eng', 'j1'], ['eng', 'j2'], ['eng', 'j3'], ['j1', 'ens'], ['j2', 'ens'], ['j3', 'ens'], ['ens', 'drift'], ['ens', 'ml']],
      live: [['cfg', 'eng'], ['eng', 'j2'], ['j1', 'ens'], ['ens', 'drift']],
    },
  },
  'elevenow-rag': {
    featured: true,
    tags: ['RAG'],
    kpiVerified: true,
    headline: { prefix: '~', value: '40', suffix: '%', label: 'retrieval cost cut — without giving up answer quality' },
    role: 'AI engineer · retrieval strategy + session intelligence',
    diagram: {
      viewBox: '0 0 680 360',
      caption: 'A skip gate asks whether history already answers the follow-up; only if not does the two-stage retrieve → rerank path run.',
      nodes: [
        { id: 'q', x: 56, y: 180, label: 'Follow-up', sub: 'multi-turn', w: 92 },
        { id: 'skip', x: 185, y: 180, label: 'RAG skip?', sub: 'LLM gate', accent: true, shape: 'diamond', w: 124 },
        { id: 'hist', x: 400, y: 70, label: 'History', sub: 'already answered', w: 120 },
        { id: 'ref', x: 320, y: 270, label: 'Reformulate', sub: 'resolve pronouns', w: 108 },
        { id: 'vec', x: 450, y: 270, label: 'Vector · 25', sub: 'ChromaDB', w: 100 },
        { id: 'rr', x: 590, y: 270, label: 'Rerank · 5', sub: 'Cohere', accent: true, w: 104 },
        { id: 'ans', x: 600, y: 120, label: 'GPT-4o', sub: 'grounded answer', w: 104 },
      ],
      edges: [['q', 'skip'], ['skip', 'hist', 'skip'], ['skip', 'ref', 'retrieve'], ['ref', 'vec'], ['vec', 'rr'], ['rr', 'ans'], ['hist', 'ans']],
      live: [['q', 'skip'], ['skip', 'hist'], ['hist', 'ans'], ['vec', 'rr']],
    },
  },
  daiso: {
    featured: false,
    tags: ['RAG', 'LLMOps'],
    kpiVerified: true,
    headline: { value: '0', label: 'external API calls — fully offline RAG for regulated teams' },
    role: 'AI engineer · local RAG stack + MLOps',
    diagram: {
      viewBox: '0 0 680 360',
      caption: 'Everything runs inside the machine boundary: versioned ingestion, local embeddings and generation, with MLflow and Evidently watching quality and drift.',
      zones: [{ x: 4, y: 24, w: 672, h: 326, label: 'on-premises · zero egress' }],
      nodes: [
        { id: 'user', x: 56, y: 180, label: 'React UI', sub: 'TypeScript', w: 92 },
        { id: 'api', x: 205, y: 180, label: 'FastAPI', sub: 'RAG backend', accent: true },
        { id: 'db', x: 355, y: 95, label: 'ChromaDB', sub: 'vector store' },
        { id: 'llm', x: 355, y: 265, label: 'Gemma 2', sub: 'Ollama · local', accent: true },
        { id: 'dvc', x: 515, y: 95, label: 'DVC ingest', sub: 'versioned docs' },
        { id: 'mon', x: 515, y: 265, label: 'MLflow', sub: '+ Evidently drift' },
      ],
      edges: [['user', 'api'], ['api', 'db', 'retrieve'], ['api', 'llm', 'generate'], ['dvc', 'db'], ['llm', 'mon']],
      live: [['user', 'api'], ['api', 'db'], ['api', 'llm'], ['dvc', 'db']],
    },
  },
  'elevenow-agents': {
    featured: false,
    tags: ['Agents'],
    kpiVerified: false, // TODO(confirm): "Average handle time reduced by ~18%" is draft copy
    headline: { value: '7', label: 'specialised copilot endpoints guiding live customer-service agents' },
    role: 'AI engineer · service design + reliability',
    diagram: {
      viewBox: '0 0 680 360',
      caption: 'A live, partial transcript fans out to specialised endpoints through one resilient async client, returning structured guidance while the call is still in progress.',
      nodes: [
        { id: 'tx', x: 56, y: 180, label: 'Transcript', sub: 'live · partial', w: 96 },
        { id: 'api', x: 190, y: 180, label: 'FastAPI', sub: '7 endpoints', accent: true },
        { id: 'cl', x: 325, y: 180, label: 'Async client', sub: 'GPT-4o-mini', w: 110 },
        { id: 'e1', x: 478, y: 48, label: 'Journey stage', w: 116 },
        { id: 'e2', x: 478, y: 136, label: 'Resolution path', w: 116 },
        { id: 'e3', x: 478, y: 224, label: 'Scorecard', w: 116 },
        { id: 'e4', x: 478, y: 312, label: 'Forecast', w: 116 },
        { id: 'ag', x: 622, y: 180, label: 'Agent', sub: 'live guidance', accent: true, w: 92 },
      ],
      edges: [['tx', 'api'], ['api', 'cl', 'backoff'], ['cl', 'e1'], ['cl', 'e2'], ['cl', 'e3'], ['cl', 'e4'], ['e1', 'ag'], ['e2', 'ag'], ['e3', 'ag'], ['e4', 'ag']],
      live: [['tx', 'api'], ['api', 'cl'], ['cl', 'e2'], ['e3', 'ag']],
    },
  },
  'cfmm-papermill': {
    featured: false,
    tags: ['Analytics'],
    kpiVerified: true,
    headline: { value: '4', label: 'analysis tracks run daily, fully automated and reproducible' },
    role: 'AI engineer · orchestration + reproducibility',
    diagram: {
      viewBox: '0 0 680 360',
      caption: 'One parameterised template, four independent category runs in parallel, and an executed-notebook archive that captures every cell’s state.',
      nodes: [
        { id: 'run', x: 56, y: 180, label: 'Daily run', sub: 'date params', w: 96 },
        { id: 'pm', x: 195, y: 180, label: 'Papermill', sub: 'orchestrator', accent: true },
        { id: 'c1', x: 375, y: 48, label: 'Headlines', sub: 'notebook', w: 150 },
        { id: 'c2', x: 375, y: 136, label: 'Generalisation bias', sub: 'notebook', w: 150 },
        { id: 'c3', x: 375, y: 224, label: 'Misrepresentation', sub: 'notebook', w: 150 },
        { id: 'c4', x: 375, y: 312, label: 'Negative aspects', sub: 'notebook', w: 150 },
        { id: 'arc', x: 580, y: 180, label: 'Archive', sub: 'executed notebooks', accent: true, w: 120 },
      ],
      edges: [['run', 'pm'], ['pm', 'c1'], ['pm', 'c2'], ['pm', 'c3'], ['pm', 'c4'], ['c1', 'arc'], ['c2', 'arc'], ['c3', 'arc'], ['c4', 'arc']],
      live: [['run', 'pm'], ['pm', 'c1'], ['pm', 'c3'], ['c2', 'arc'], ['c4', 'arc']],
    },
  },
  'stem-monitoring': {
    featured: false,
    tags: ['Analytics'],
    kpiVerified: false, // TODO(confirm): "Expert disagreement … reduced by ~32%" is draft copy
    headline: { value: '6', label: 'dashboard views turning job-posting NLP into curriculum decisions' },
    role: 'AI engineer · NLP pipeline + dashboard',
    diagram: {
      viewBox: '0 0 680 360',
      caption: 'Unstructured job postings become normalised skills, which are scored against curriculum offerings and mapped as a co-occurrence network.',
      nodes: [
        { id: 'jobs', x: 56, y: 180, label: 'Job posts', sub: 'unstructured', w: 92 },
        { id: 'nlp', x: 190, y: 180, label: 'Skill NLP', sub: 'extract · normalise', accent: true, w: 116 },
        { id: 'tax', x: 330, y: 180, label: 'Taxonomy', sub: 'alignment' },
        { id: 'cur', x: 330, y: 60, label: 'Curriculum', sub: 'academic offerings', w: 116 },
        { id: 'gap', x: 470, y: 100, label: 'Gap scorer', sub: 'TF-IDF', w: 100 },
        { id: 'net', x: 470, y: 270, label: 'Co-occurrence', sub: 'NetworkX', w: 116 },
        { id: 'dash', x: 612, y: 180, label: 'Dashboard', sub: 'Streamlit · 6 pages', accent: true, w: 116 },
      ],
      edges: [['jobs', 'nlp'], ['nlp', 'tax'], ['tax', 'gap'], ['cur', 'gap'], ['tax', 'net'], ['gap', 'dash'], ['net', 'dash']],
      live: [['jobs', 'nlp'], ['nlp', 'tax'], ['tax', 'gap'], ['net', 'dash']],
    },
  },
  'triage-demo': {
    featured: false,
    tags: ['Agents'],
    kpiVerified: true,
    headline: { value: '100', suffix: '%', label: 'of triage decisions logged with reference IDs for audit' },
    role: 'AI engineer · prompt, parser + audit logging',
    diagram: {
      viewBox: '0 0 680 360',
      caption: 'Claude returns XML-tagged fields that parse deterministically; every decision gets a reference ID and lands in an append-only audit log.',
      nodes: [
        { id: 'case', x: 56, y: 180, label: 'Case text', sub: 'unstructured', w: 96 },
        { id: 'llm', x: 190, y: 180, label: 'Claude', sub: 'XML-tagged prompt', accent: true, w: 116 },
        { id: 'xml', x: 330, y: 180, label: 'XML parser', sub: 'deterministic', w: 116 },
        { id: 'ref', x: 475, y: 95, label: 'Reference ID', sub: 'MD5 · timestamp', w: 112 },
        { id: 'ui', x: 475, y: 265, label: 'Streamlit', sub: 'triage decision', w: 112 },
        { id: 'log', x: 615, y: 95, label: 'Audit log', sub: 'CSV', accent: true, w: 90 },
      ],
      edges: [['case', 'llm'], ['llm', 'xml'], ['xml', 'ref'], ['xml', 'ui'], ['ref', 'log']],
      live: [['case', 'llm'], ['llm', 'xml'], ['xml', 'ref'], ['ref', 'log']],
    },
  },
};

export const FILTERS: ('All' | Tag)[] = ['All', 'RAG', 'Agents', 'LLMOps', 'Analytics'];
