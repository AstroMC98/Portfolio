/**
 * Model bake-off harness: Claude vs Gemini vs OpenAI on persona, technical and latency tasks.
 *
 *   ANTHROPIC_API_KEY=… GEMINI_API_KEY=… OPENAI_API_KEY=… node scripts/model-bakeoff/run.mjs [--judge]
 *
 * Writes src/data/bakeoff-results.json, which the blog post renders automatically.
 * Measures time-to-first-token (TTFT), total latency, output tokens/sec and cost per call,
 * auto-scores the latency tasks, and (with --judge) has each output graded by the OTHER
 * two vendors' flagship models to avoid self-preference.
 *
 * Note: refusal fallbacks are deliberately NOT enabled — a benchmark must measure only the
 * named model. Refusals are recorded as such.
 */
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { writeFileSync } from 'node:fs';
import { MODELS, TASKS, RUNS_PER_TASK } from './config.mjs';

const anthropic = new Anthropic();
const openai = new OpenAI();
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const JUDGE = process.argv.includes('--judge');

/** Stream one completion; returns text, TTFT, total time and token usage. */
async function call(model, system, prompt) {
  const t0 = performance.now();
  let ttft = null;
  let text = '';
  const mark = () => { if (ttft === null) ttft = performance.now() - t0; };

  if (model.vendor === 'anthropic') {
    const stream = anthropic.messages.stream({
      model: model.id,
      max_tokens: 16000,
      system,
      output_config: { effort: model.effort ?? 'medium' },
      messages: [{ role: 'user', content: prompt }],
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        mark();
        text += event.delta.text;
      }
    }
    const final = await stream.finalMessage();
    return {
      text, ttft, total: performance.now() - t0,
      inTok: final.usage.input_tokens, outTok: final.usage.output_tokens,
      refused: final.stop_reason === 'refusal',
    };
  }

  if (model.vendor === 'openai') {
    const stream = await openai.responses.create({ model: model.id, instructions: system, input: prompt, stream: true });
    let usage = null;
    for await (const event of stream) {
      if (event.type === 'response.output_text.delta') { mark(); text += event.delta; }
      if (event.type === 'response.completed') usage = event.response.usage;
    }
    return { text, ttft, total: performance.now() - t0, inTok: usage?.input_tokens ?? 0, outTok: usage?.output_tokens ?? 0, refused: false };
  }

  // google
  const stream = await gemini.models.generateContentStream({ model: model.id, contents: prompt, config: { systemInstruction: system } });
  let usage = null;
  for await (const chunk of stream) {
    const t = chunk.text;
    if (t) { mark(); text += t; }
    if (chunk.usageMetadata) usage = chunk.usageMetadata;
  }
  // Gemini reports reasoning ("thinking") tokens separately from candidate tokens; both are billed as output.
  // (Anthropic's output_tokens and OpenAI's output_tokens already include thinking/reasoning tokens.)
  const outTok = (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0);
  return { text, ttft, total: performance.now() - t0, inTok: usage?.promptTokenCount ?? 0, outTok, refused: false };
}

function autoScore(task, text) {
  if (!task.expected) return null;
  try {
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const keys = Object.keys(task.expected);
    const hits = keys.filter((k) => String(json[k] ?? '').trim().toLowerCase() === task.expected[k].toLowerCase()).length;
    return hits / keys.length;
  } catch {
    return 0;
  }
}

async function judge(task, output, authorVendor) {
  const judges = MODELS.filter((m) => m.tier === 'flagship' && m.vendor !== authorVendor);
  const rubric = task.rubric.map((r, i) => `${i + 1}. ${r}`).join('\n');
  const prompt = `Score the RESPONSE against each rubric item from 1 (poor) to 5 (excellent).
Return JSON only: {"scores": [n, ...], "overall": n}

TASK: ${task.title}
CONTEXT: ${task.system}
INPUT: ${task.prompt}
RUBRIC:
${rubric}

RESPONSE:
${output}`;
  const scores = [];
  for (const j of judges) {
    try {
      const r = await call(j, 'You are a strict, fair evaluator. Output JSON only.', prompt);
      const parsed = JSON.parse(r.text.slice(r.text.indexOf('{'), r.text.lastIndexOf('}') + 1));
      scores.push({ judge: j.id, overall: Number(parsed.overall), items: parsed.scores });
    } catch (err) {
      scores.push({ judge: j.id, error: String(err) });
    }
  }
  return scores;
}

const cost = (m, inTok, outTok) => (inTok * m.price.in + outTok * m.price.out) / 1e6;

const runs = [];
for (const task of TASKS) {
  for (const model of MODELS) {
    for (let r = 0; r < RUNS_PER_TASK; r++) {
      process.stdout.write(`${task.id} · ${model.id} · run ${r + 1}/${RUNS_PER_TASK}\r`);
      try {
        const res = await call(model, task.system, task.prompt);
        const row = {
          model: model.id, task: task.id, category: task.category, run: r + 1,
          ttftMs: Math.round(res.ttft ?? res.total), totalMs: Math.round(res.total),
          inputTokens: res.inTok, outputTokens: res.outTok,
          outputTps: res.outTok && res.total ? +(res.outTok / ((res.total - (res.ttft ?? 0)) / 1000)).toFixed(1) : null,
          costUsd: +cost(model, res.inTok, res.outTok).toFixed(6),
          refused: res.refused,
          autoScore: autoScore(task, res.text),
          output: res.text,
        };
        // Judge only the first run of judged tasks to keep spend predictable.
        if (JUDGE && task.rubric && r === 0) row.judgeScores = await judge(task, res.text, model.vendor);
        runs.push(row);
      } catch (err) {
        runs.push({ model: model.id, task: task.id, category: task.category, run: r + 1, error: String(err) });
      }
    }
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  runsPerTask: RUNS_PER_TASK,
  judged: JUDGE,
  models: MODELS.map(({ id, vendor, label, tier, price }) => ({ id, vendor, label, tier, price })),
  tasks: TASKS.map(({ id, category, title, system, prompt, rubric, expected }) => ({ id, category, title, system, prompt, rubric, expected })),
  runs,
};
writeFileSync(new URL('../../src/data/bakeoff-results.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(`\nWrote ${runs.length} runs to src/data/bakeoff-results.json`);
