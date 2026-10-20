export type Lane = 'industry' | 'consulting' | 'teaching' | 'education';

export interface Role {
  id: string;
  title: string;
  org: string;
  orgNote?: string;
  start: number; // decimal year
  end: number | null; // null = present
  dates: string;
  lane: Lane;
  current?: boolean;
  metric?: { value: string; label: string };
  bullets: string[];
  forYou: string;
}

export const NOW = 2026.8;
export const TIMELINE_START = 2020;
export const TIMELINE_END = 2027;

export const LANES: { id: Lane; label: string }[] = [
  { id: 'industry', label: 'Industry' },
  { id: 'consulting', label: 'Consulting' },
  { id: 'teaching', label: 'Teaching' },
  { id: 'education', label: 'Education' },
];

export const ROLES: Role[] = [
  {
    id: 'ias',
    title: 'Lead AI Engineer · Tech Consultant',
    org: 'Intelligent AI Solutions',
    orgNote: 'UK enterprise AI consultancy · independent contractor',
    start: 2024.67,
    end: null,
    dates: 'Sep 2024 → Present',
    lane: 'industry',
    current: true,
    metric: { value: 'Prototype → prod', label: 'enterprise RAG + media-intelligence platforms shipped end-to-end' },
    bullets: [
      'Led end-to-end development of enterprise LLM solutions: a media monitoring system for large-scale bias detection, and a RAG knowledge management system for a global travel agency.',
      'Spearheaded AI research and production deployment: advanced RAG architectures, fine-tuning, scalable LLM implementations, agentic chatbots and automated workflow systems across multiple industries.',
    ],
    forYou: 'Your AI project won’t get stuck at prototype — I take RAG, media intelligence and agentic systems from first commit to enterprise production.',
  },
  {
    id: 'ciit',
    title: 'Data Science Instructor & Mentor',
    org: 'CIIT & Eskwelabs',
    start: 2023.83,
    end: null,
    dates: 'Nov 2023 → Present',
    lane: 'teaching',
    current: true,
    metric: { value: 'Gov + C-suite', label: 'cohorts trained on AI, no-code AI and data science' },
    bullets: [
      'Instructor and mentor for workshops, bootcamps, hackathons and trainings on AI, No-Code AI and Data Science — for government organisations, corporate executives and professionals.',
    ],
    forYou: 'Teams leave actually using AI — sessions built around real workflows, not slide decks.',
  },
  {
    id: 'pshs',
    title: 'Senior Data Science Consultant',
    org: 'Philippine Science High School',
    orgNote: 'Knowledge Innovation Division',
    start: 2024.67,
    end: 2025.92,
    dates: 'Sep 2024 → Dec 2025',
    lane: 'consulting',
    metric: { value: 'System-wide', label: 'student-performance analytics for targeted interventions' },
    bullets: [
      'Spearheaded data science initiatives — student performance management and data-driven curriculum enhancement for targeted academic interventions.',
    ],
    forYou: 'Non-technical stakeholders can operate what I build — no in-house data scientist required.',
  },
  {
    id: 'tdcx',
    title: 'Global Data Science Manager',
    org: 'TDCX AI',
    orgNote: 'Singapore',
    start: 2023.58,
    end: 2024.67,
    dates: 'Aug 2023 → Sep 2024',
    lane: 'industry',
    metric: { value: '20%+', label: 'faster agent time-to-proficiency via an LLM training simulator' },
    bullets: [
      'Built an LLM-powered web app generating realistic simulation scenarios for agent training — cut time-to-proficiency by at least 20%.',
      'Developed a forecasting model streamlining workforce management with predictive analytics and simulation in a user-friendly interface.',
    ],
    forYou: 'Your people ramp faster — a measurable productivity gain you can put in front of your CFO.',
  },
  {
    id: 'aia',
    title: 'Data Scientist',
    org: 'AIA Digital+',
    orgNote: 'Asia-Pacific',
    start: 2022.58,
    end: 2023.58,
    dates: 'Aug 2022 → Aug 2023',
    lane: 'industry',
    metric: { value: '95%', label: 'less FTE for Next-Best-Action model development' },
    bullets: [
      'Designed an end-to-end data pipeline for Next Best Action campaigns — reduced required FTE for NBA model development by up to 95%.',
      'Built a fraud-detection solution to automate claim approvals — projected 25% reduction in processing time.',
    ],
    forYou: 'High-volume, repetitive processes get automated — at Fortune 500 scale, inside a single engagement.',
  },
  {
    id: 'aim',
    title: 'MS Data Science',
    org: 'Asian Institute of Management',
    start: 2021.17,
    end: 2022.45,
    dates: 'Mar 2021 → Jun 2022',
    lane: 'education',
    bullets: [],
    forYou: '',
  },
  {
    id: 'pgc',
    title: 'Senior Research Associate — Analytics & Visualization',
    org: 'Philippine Genome Center',
    start: 2020.67,
    end: 2021.17,
    dates: 'Sep 2020 → Mar 2021',
    lane: 'industry',
    metric: { value: '3', label: 'peer-reviewed papers from national SARS-CoV-2 genomic surveillance' },
    bullets: [
      'Reduced reporting times for genomic analysis of SARS-CoV-2 samples through custom data pipelines and analytical modules.',
      'Co-authored peer-reviewed papers on emerging SARS-CoV-2 variants in the Philippines.',
    ],
    forYou: 'My pipelines ran in a national COVID-19 response — the same rigour goes into every client system.',
  },
];

/** Point events plotted on the career timeline. */
export const MILESTONES = [
  { at: 2021.2, label: 'B.1.1.7 genome paper', kind: 'paper' },
  { at: 2022.85, label: 'UN Big Data · 2nd of 123', kind: 'award' },
  { at: 2022.9, label: 'USHER Hackathon · 3rd', kind: 'award' },
  { at: 2024.8, label: 'Hack4Health · 1st', kind: 'award' },
  { at: 2025.5, label: 'Hack-A-Street · 1st', kind: 'award' },
] as const;
