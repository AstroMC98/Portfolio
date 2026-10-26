/**
 * Engagement context for each case file — the "forward-deployed" facts recruiters look for.
 * Every field is optional: anything left undefined is simply not rendered.
 *
 * TODO(confirm): fill these in from your own records. Keep clients anonymised if needed
 * ("Global travel agency", "UK media-monitoring client"). Do not publish confidential names.
 */
export interface Engagement {
  /** Industry / client descriptor, e.g. "Insurance · Asia-Pacific" */
  sector?: string;
  /** Who you delivered it through, e.g. "Intelligent AI Solutions (UK)" */
  employer?: string;
  /** e.g. "2025" or "Q1–Q3 2025" */
  when?: string;
  /** e.g. "10 weeks" */
  duration?: string;
  /** e.g. "Me + 1 backend engineer, client PM" */
  team?: string;
  /** e.g. "~400 internal users" or "2,000 documents / day" */
  scale?: string;
  /** e.g. "6 weeks from kickoff" */
  timeToProd?: string;
  /** The brief, in the client's words: what they asked for */
  ask?: string;
  /** What the real problem turned out to be after discovery */
  realProblem?: string;
  /** What you scoped the MVP down to */
  scopedTo?: string;
  /** 2–3 min screen-recorded walkthrough (Loom / YouTube unlisted) */
  walkthroughUrl?: string;
  /** Public repo or live demo, if one exists */
  demoUrl?: string;
  /**
   * Snippet files whose failure mode was a real production incident (not just a design risk).
   * Listed files get an "Incident" badge in the hardening log.
   */
  incidents?: string[];
}

export const ENGAGEMENTS: Record<string, Engagement> = {
  'document-intelligence': {
    // sector: '', employer: '', when: '', duration: '', team: '', scale: '', timeToProd: '',
    // ask: '', realProblem: '', scopedTo: '', walkthroughUrl: '', incidents: [],
  },
  'local-rag': {},
  'enterprise-rag-chat': {},
  'llmops-platform': {},
  'agent-copilot': {},
  'hybrid-rag': {},
  'media-analysis': {},
  'stem-monitoring': {},
  'triage-demo': {},
};

/** Recommendations from managers / clients (e.g. copied from LinkedIn with permission). */
export interface Testimonial {
  quote: string;
  name: string;
  role: string; // e.g. "Head of Data, AIA Digital+"
}
// TODO(confirm): add 2–3 real quotes. The section stays hidden while this is empty.
export const TESTIMONIALS: Testimonial[] = [];
