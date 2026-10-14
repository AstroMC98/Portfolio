/**
 * Bake-off configuration: models, published prices and the task suite.
 *
 * Prices are USD per 1M tokens from each vendor's pricing page (checked Oct 2026).
 * Re-check before publishing — vendors change prices (Gemini 4 Argon rises to $4/$20 on 1 Dec 2026).
 */
export const MODELS = [
  { id: 'claude-opus-5-5', vendor: 'anthropic', label: 'Claude Opus 5.5', tier: 'flagship', price: { in: 4, out: 20 }, effort: 'medium' },
  { id: 'claude-haiku-5-5', vendor: 'anthropic', label: 'Claude Haiku 5.5', tier: 'fast', price: { in: 0.1, out: 0.5 }, effort: 'low' },
  { id: 'gemini-4-argon', vendor: 'google', label: 'Gemini 4 Argon', tier: 'flagship', price: { in: 2, out: 10 } },
  { id: 'gemini-3.8-flash', vendor: 'google', label: 'Gemini 3.8 Flash', tier: 'fast', price: { in: 0.75, out: 3.75 } },
  { id: 'gpt-6-astra', vendor: 'openai', label: 'GPT-6 Astra', tier: 'flagship', price: { in: 10, out: 50 } },
  { id: 'gpt-6-luna', vendor: 'openai', label: 'GPT-6 Luna', tier: 'fast', price: { in: 0.1, out: 0.5 } },
];

/** Repetitions per (model, task) — latency is reported as median and p90 across these. */
export const RUNS_PER_TASK = 5;

/**
 * Task suite. `category` drives the post's sections:
 *  - persona: human-facing voice and empathy (judged)
 *  - technical: code and debugging (judged)
 *  - latency: short structured outputs where speed matters (auto-scored against `expected`)
 */
export const TASKS = [
  {
    id: 'persona-refund',
    category: 'persona',
    title: 'Angry customer, delayed refund',
    system:
      'You are Maya, a customer-care specialist for an online electronics store in the Philippines. You are warm, calm and practical, and you may use light Taglish where natural. Policy: refunds post 7–10 business days after approval; you can escalate to a supervisor; you cannot promise a specific date.',
    prompt:
      'Customer: "This is the THIRD time I am messaging. My refund was approved 12 days ago and I still have nothing. I need that money for my kid\'s tuition. Ano ba talaga nangyayari?"',
    rubric: ['Acknowledges emotion specifically, not generically', 'Stays in persona and tone', 'Accurate to policy — no invented promises', 'Gives a concrete next step', 'Concise (under ~120 words)'],
  },
  {
    id: 'persona-coach',
    category: 'persona',
    title: 'Coaching a struggling new agent',
    system:
      'You are a supportive team lead in a customer-service BPO. You coach new agents using specific, kind, actionable feedback.',
    prompt:
      'An agent in their second week had a call where they interrupted the customer three times and ended without confirming the issue was resolved. They are discouraged. Write the feedback you would give them in a 1:1.',
    rubric: ['Specific about the behaviours', 'Encouraging without being vague', 'Gives 1–3 concrete techniques', 'Natural, human voice', 'Concise'],
  },
  {
    id: 'tech-ratelimiter',
    category: 'technical',
    title: 'Write an async sliding-window rate limiter',
    system: 'You are a senior Python engineer. Return only code with brief comments.',
    prompt:
      'Write an asyncio-safe sliding-window rate limiter class in Python (max N calls per 60 s, shared across concurrent coroutines) plus three pytest tests, including one that fires a burst of concurrent calls.',
    rubric: ['Correct under concurrency (lock or equivalent)', 'Sliding window, not fixed window', 'Tests exercise a concurrent burst', 'Readable and idiomatic', 'No unnecessary code'],
  },
  {
    id: 'tech-debug',
    category: 'technical',
    title: 'Find the bug in a rate limiter',
    system: 'You are a senior Python engineer reviewing code.',
    prompt: `Find and fix the bug in this code. Explain the root cause in two sentences.

import asyncio, time
_calls = 0
_window_start = time.time()

async def rate_limited_call(fn, *args):
    global _calls, _window_start
    elapsed = time.time() - _window_start
    if _calls >= 10 and elapsed < 1.0:
        await asyncio.sleep(1.0 - elapsed)
        _calls = 0
        _window_start = time.time()
    _calls += 1
    return await fn(*args)`,
    rubric: ['Identifies the shared-state race on wake-up', 'Notes the counter never resets after the window passes', 'Fix is correct (lock + sliding window or equivalent)', 'Explanation is clear and short'],
  },
  {
    id: 'latency-intent',
    category: 'latency',
    title: 'Classify a support ticket',
    system:
      'Classify the customer message into exactly one intent: refund, delivery, technical, billing, account, other. Reply with JSON only: {"intent": "..."}',
    prompt: 'Hi, I was charged twice for the same order last Tuesday, can you check my card statement?',
    expected: { intent: 'billing' },
  },
  {
    id: 'latency-extract',
    category: 'latency',
    title: 'Extract fields to JSON',
    system:
      'Extract the order number, product and city from the message. Reply with JSON only: {"order": "...", "product": "...", "city": "..."}',
    prompt: 'Order #PH-48213 — my wireless earbuds still have not arrived in Cebu City.',
    expected: { order: 'PH-48213', product: 'wireless earbuds', city: 'Cebu City' },
  },
];
