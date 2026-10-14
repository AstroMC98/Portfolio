/**
 * Local-only blog admin.
 *
 * Runs ONLY inside `astro dev` (via the astro:server:setup hook) — it adds no routes to the
 * production build, so nothing here is ever deployed. It serves admin/index.html at /admin and a
 * small JSON API that reads and writes the MDX posts in src/content/{blog,drafts}.
 *
 * Safeguards:
 *  - Only answers requests from the local machine (loopback addresses).
 *  - Password from ADMIN_PASSWORD in the git-ignored .env file; compared in constant time.
 *  - HttpOnly, SameSite=Strict session cookie; sessions expire after 8 hours.
 *  - Failed logins are rate-limited (5 per 5 minutes).
 *  - State-changing requests must carry an `X-Admin: 1` header (blocks cross-site form posts).
 *  - Slugs are validated, so paths can never escape the content folders.
 *  - "Delete" moves a post to src/content/.trash (git-ignored) instead of erasing it.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { loadEnv } from 'vite';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const CONTENT = path.join(ROOT, 'src', 'content');
const FOLDERS = { blog: path.join(CONTENT, 'blog'), drafts: path.join(CONTENT, 'drafts') };
const TRASH = path.join(CONTENT, '.trash');
const DATA = path.join(ROOT, 'src', 'data');
const ADMIN_HTML = path.join(ROOT, 'admin', 'index.html');
/** Git-ignored local state: which "your experience" passages you have already checked. */
const STATE = path.join(ROOT, 'admin', '.state.json');

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SESSION_MS = 8 * 60 * 60 * 1000;
const COOKIE = 'mc_admin';
const MOTIFS = ['paths', 'deploy', 'civic', 'shield', 'brush', 'triad', 'chip', 'stack', 'loop', 'drift'];

const sessions = new Map(); // token -> expiry
const failures = []; // timestamps of failed logins

const sha = (s) => createHash('sha256').update(String(s)).digest();
const isLoopback = (addr = '') => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(addr);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readBody(req, limit = 2_000_000) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw Object.assign(new Error('Payload too large'), { status: 413 });
    chunks.push(c);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function tokenFrom(req) {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})`));
  return m ? m[1] : null;
}

function authed(req) {
  const t = tokenFrom(req);
  if (!t) return false;
  const exp = sessions.get(t);
  if (!exp || exp < Date.now()) {
    sessions.delete(t);
    return false;
  }
  return true;
}

/** Split an MDX file into frontmatter (object) and body (string). */
function parsePost(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: text };
  return { frontmatter: YAML.parse(m[1]) ?? {}, body: m[2] };
}

/**
 * Write frontmatter + body back to MDX. When the original file is given, its YAML document is edited
 * in place: keys whose value did not change keep their original node (quoting, flow arrays, key order),
 * so a save only touches the lines you actually edited. Line endings follow the original file.
 */
function serialisePost(frontmatter, body, original = '') {
  const eol = /\r\n/.test(original) ? '\r\n' : '\n';
  const m = original.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const doc = YAML.parseDocument(m ? m[1] : '');
  if (!YAML.isMap(doc.contents)) doc.contents = doc.createNode({});
  const before = doc.toJS() ?? {};
  for (const key of Object.keys(before)) if (!(key in frontmatter)) doc.delete(key);
  for (const [key, value] of Object.entries(frontmatter)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(value)) doc.set(key, value);
  }
  const fm = doc.toString({ lineWidth: 0, flowCollectionPadding: false }).trimEnd();
  const text = `---\n${fm}\n---\n${body.replace(/\r\n/g, '\n').replace(/^\n+/, '')}`;
  return eol === '\n' ? text : text.replace(/\n/g, eol);
}

const reviewFlags = (fm, body) =>
  (fm.review ? 1 : 0) + (body.match(/<Note[^>]*\sreview[\s>]/g) || []).length;

function statusOf(folder, fm, body) {
  if (folder === 'drafts') return 'local-draft';
  if (fm.draft) return 'draft';
  if (reviewFlags(fm, body)) return 'needs-review';
  const d = new Date(fm.date);
  return d.getTime() > Date.now() ? 'scheduled' : 'live';
}

async function findPost(slug) {
  for (const [folder, dir] of Object.entries(FOLDERS)) {
    const file = path.join(dir, `${slug}.mdx`);
    try {
      await fs.access(file);
      return { folder, file };
    } catch {}
  }
  return null;
}

/* ---------- "Needs you": find the passages that need the author, not the whole file ---------- */

const idOf = (...parts) => createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 16);
const lineAt = (text, i) => text.slice(0, i).split('\n').length;
const TODO = /TODO|\bTK\b|\[confirm\]|\[citation needed\]/;
const PLACEHOLDERS = ['Opening paragraph.', 'Write here.', 'One-sentence summary of the post.'];

async function readState() {
  try {
    return { acks: {}, ...JSON.parse(await fs.readFile(STATE, 'utf8')) };
  } catch {
    return { acks: {} };
  }
}
const writeState = (s) => fs.writeFile(STATE, JSON.stringify(s, null, 2), 'utf8');

/** Heading of the `## ` section that contains offset i ("Introduction" before the first one). */
function sectionAt(text, i) {
  const hs = [...text.slice(0, i).matchAll(/^## +(.+?)\s*$/gm)];
  return hs.length ? hs[hs.length - 1][1] : 'Introduction';
}

function fenceRanges(text) {
  return [...text.matchAll(/^```[\s\S]*?^```/gm)].map((m) => [m.index, m.index + m[0].length]);
}

/**
 * Scan one post. Offsets (`start`) and `original` refer to the raw file text, so a fix can be
 * applied to exactly that snippet (and refused if the file changed since it was scanned).
 */
function scanPost(slug, folder, text, acks) {
  const { frontmatter: fm } = parsePost(text);
  const base = { slug, folder, file: path.relative(ROOT, path.join(FOLDERS[folder], `${slug}.mdx`)).replace(/\\/g, '/'), title: fm.title ?? slug };
  const items = [];
  const at = (start, original, extra) => ({ ...base, start, original, line: lineAt(text, start), section: sectionAt(text, start), ...extra });

  if (fm.review) items.push({ ...base, kind: 'review', id: idOf(slug, 'fm-review'), field: 'review', original: String(fm.review), section: 'Post details', line: 1 });

  for (const m of text.matchAll(/<Note\b[^>]*>[\s\S]*?<\/Note>/g)) {
    const open = m[0].match(/^<Note\b[^>]*>/)[0];
    const review = /\sreview(?=[\s>/=])/.test(open);
    const voice = /kind=["']field["']/.test(open);
    if (!review && !voice) continue;
    const id = idOf(slug, m[0].replace(/\r\n/g, '\n'));
    if (!review && acks[id]) continue;
    items.push(at(m.index, m[0], { kind: review ? 'review' : 'voice', id }));
  }

  const fences = fenceRanges(text);
  for (const m of text.matchAll(/^.*$/gm)) {
    if (!TODO.test(m[0]) || fences.some(([a, b]) => m.index >= a && m.index < b)) continue;
    items.push(at(m.index, m[0], { kind: 'todo', id: idOf(slug, 'todo', m[0]) }));
  }
  for (const p of PLACEHOLDERS) {
    const i = text.indexOf(p);
    if (i === -1) continue;
    const start = text.lastIndexOf('\n', i) + 1;
    const end = text.indexOf('\n', i);
    const line = text.slice(start, end === -1 ? undefined : end).replace(/\r$/, '');
    items.push(at(start, line, { kind: 'placeholder', id: idOf(slug, 'ph', p) }));
  }

  const missing = [!fm.thesis && 'thesis', !fm.takeaways?.length && 'key takeaways', !fm.sources?.length && 'sources'].filter(Boolean);
  if (missing.length) items.push({ ...base, kind: 'details', id: idOf(slug, 'details'), section: 'Post details', line: 1, missing });
  return items;
}

/** `TODO(confirm)` markers in src/data/*.ts — the site facts only you can supply. */
async function scanData() {
  const items = [];
  for (const f of (await fs.readdir(DATA)).filter((x) => x.endsWith('.ts'))) {
    const text = await fs.readFile(path.join(DATA, f), 'utf8');
    const lines = text.split('\n');
    let offset = 0;
    const starts = lines.map((l) => ((offset += l.length + 1), offset - l.length - 1));
    lines.forEach((l, i) => {
      if (!l.includes('TODO(confirm)')) return;
      // Snippet: an inline comment is just its line; a `//` comment takes the code line it describes;
      // a line inside a /** */ block runs to the end of that block.
      let j = i;
      const t = l.trim();
      if (t.startsWith('*') || t.startsWith('/*')) while (j < lines.length - 1 && !lines[j].includes('*/')) j++;
      else if (t.startsWith('//')) while (j < lines.length - 1 && j - i < 8 && /^\s*\/\//.test(lines[j])) j++;
      const original = lines.slice(i, j + 1).join('\n').replace(/\r$/, '');
      items.push({ kind: 'site', id: idOf('data', f, l), file: `src/data/${f}`, title: f, start: starts[i], original, line: i + 1, section: f.replace(/\.ts$/, '') });
    });
  }
  return items;
}

async function scanAll() {
  const { acks } = await readState();
  const items = [];
  for (const [folder, dir] of Object.entries(FOLDERS)) {
    let files = [];
    try {
      files = await fs.readdir(dir);
    } catch {}
    for (const f of files.filter((x) => x.endsWith('.mdx'))) {
      items.push(...scanPost(f.replace(/\.mdx$/, ''), folder, await fs.readFile(path.join(dir, f), 'utf8'), acks));
    }
  }
  items.push(...(await scanData()));
  return items;
}

/** Resolve a patch target to a file path. Only posts and src/data/*.ts are editable. */
async function targetFile(t = {}) {
  if (t.type === 'post' && SLUG.test(t.slug || '')) return (await findPost(t.slug))?.file ?? null;
  if (t.type === 'data' && /^[A-Za-z0-9_-]+\.ts$/.test(t.name || '')) {
    const files = await fs.readdir(DATA);
    return files.includes(t.name) ? path.join(DATA, t.name) : null;
  }
  return null;
}

async function listPosts() {
  const { acks } = await readState();
  const out = [];
  for (const [folder, dir] of Object.entries(FOLDERS)) {
    let files = [];
    try {
      files = await fs.readdir(dir);
    } catch {}
    for (const f of files.filter((x) => x.endsWith('.mdx'))) {
      const text = await fs.readFile(path.join(dir, f), 'utf8');
      const { frontmatter: fm, body } = parsePost(text);
      out.push({
        slug: f.replace(/\.mdx$/, ''),
        folder,
        title: fm.title ?? f,
        date: fm.date ? String(fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : fm.date) : '',
        kicker: fm.kicker ?? '',
        featured: !!fm.featured,
        draft: !!fm.draft,
        status: statusOf(folder, fm, body),
        reviewFlags: reviewFlags(fm, body),
        needs: scanPost(f.replace(/\.mdx$/, ''), folder, text, acks).length,
        words: body.replace(/<[^>]+>|\{[^}]*\}|import .*/g, ' ').split(/\s+/).filter(Boolean).length,
      });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Validate and normalise frontmatter coming from the editor. Returns [clean, errors]. */
function validate(fm) {
  const errors = [];
  const clean = { ...fm };
  if (!clean.title || typeof clean.title !== 'string') errors.push('Title is required.');
  if (!clean.dek || typeof clean.dek !== 'string') errors.push('Dek (summary) is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(clean.date || ''))) errors.push('Date must be YYYY-MM-DD.');
  if (clean.updated && !/^\d{4}-\d{2}-\d{2}$/.test(String(clean.updated))) errors.push('Updated date must be YYYY-MM-DD.');
  if (clean.updated && clean.date && String(clean.updated) < String(clean.date)) errors.push('Updated date cannot be before the publish date.');
  if (clean.motif && !MOTIFS.includes(clean.motif)) errors.push(`Motif must be one of: ${MOTIFS.join(', ')}.`);
  for (const k of ['tags', 'takeaways']) {
    if (clean[k] != null && (!Array.isArray(clean[k]) || clean[k].some((x) => typeof x !== 'string'))) errors.push(`${k} must be a list of strings.`);
  }
  if (clean.sources != null) {
    if (!Array.isArray(clean.sources)) errors.push('sources must be a list.');
    else
      clean.sources.forEach((s, i) => {
        try {
          new URL(s.url);
        } catch {
          errors.push(`Source ${i + 1} has an invalid URL.`);
        }
        if (!s.label) errors.push(`Source ${i + 1} needs a label.`);
      });
  }
  // Drop empty optional fields so the files stay tidy.
  for (const k of ['kicker', 'thesis', 'review', 'updated']) if (clean[k] === '' || clean[k] == null) delete clean[k];
  for (const k of ['featured', 'draft']) if (!clean[k]) delete clean[k];
  for (const k of ['takeaways', 'sources', 'tags']) if (Array.isArray(clean[k]) && clean[k].length === 0) delete clean[k];
  // Keep date as a plain YYYY-MM-DD scalar (not a quoted string or timestamp).
  if (clean.date) clean.date = String(clean.date);
  return [clean, errors];
}

async function handleApi(req, res, url) {
  const route = url.pathname.replace(/^\/admin\/api/, '') || '/';
  const method = req.method || 'GET';

  if (method !== 'GET' && req.headers['x-admin'] !== '1') return json(res, 403, { error: 'Missing X-Admin header.' });

  if (route === '/session' && method === 'GET') return json(res, 200, { authenticated: authed(req) });

  if (route === '/login' && method === 'POST') {
    const now = Date.now();
    while (failures.length && failures[0] < now - 5 * 60_000) failures.shift();
    if (failures.length >= 5) return json(res, 429, { error: 'Too many attempts. Try again in a few minutes.' });
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return json(res, 500, { error: 'ADMIN_PASSWORD is not set in .env.' });
    const { password = '' } = await readBody(req, 10_000);
    if (!timingSafeEqual(sha(password), sha(expected))) {
      failures.push(now);
      return json(res, 401, { error: 'Wrong password.' });
    }
    const token = randomBytes(32).toString('hex');
    sessions.set(token, now + SESSION_MS);
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=${SESSION_MS / 1000}`);
    return json(res, 200, { ok: true });
  }

  if (!authed(req)) return json(res, 401, { error: 'Not signed in.' });

  if (route === '/logout' && method === 'POST') {
    sessions.delete(tokenFrom(req));
    res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=0`);
    return json(res, 200, { ok: true });
  }

  if (route === '/meta' && method === 'GET') return json(res, 200, { motifs: MOTIFS, root: ROOT.split(path.sep).join('/') });

  if (route === '/posts' && method === 'GET') return json(res, 200, { posts: await listPosts() });

  if (route === '/needs' && method === 'GET') {
    const slug = url.searchParams.get('slug');
    const items = await scanAll();
    return json(res, 200, { items: slug ? items.filter((i) => i.slug === slug) : items });
  }

  // Replace one snippet in a post or data file. Refused (409) if the file changed since it was scanned.
  if (route === '/patch' && method === 'POST') {
    const { target, start, original, replacement, ack } = await readBody(req);
    const file = await targetFile(target);
    if (!file) return json(res, 400, { error: 'Unknown or non-editable file.' });
    if (typeof start !== 'number' || typeof original !== 'string' || typeof replacement !== 'string') return json(res, 400, { error: 'Bad patch.' });
    const text = await fs.readFile(file, 'utf8');
    if (text.slice(start, start + original.length) !== original) return json(res, 409, { error: 'The file changed since this list was loaded. Refresh and try again.' });
    const lf = replacement.replace(/\r\n/g, '\n');
    const rep = /\r\n/.test(text) ? lf.replace(/\n/g, '\r\n') : lf;
    await fs.writeFile(file, text.slice(0, start) + rep + text.slice(start + original.length), 'utf8');
    if (ack && target.type === 'post') {
      const state = await readState();
      state.acks[idOf(target.slug, lf)] = new Date().toISOString();
      await writeState(state);
    }
    return json(res, 200, { ok: true });
  }

  // Mark a "your experience" passage as checked (it reappears if its text changes).
  if (route === '/ack' && method === 'POST') {
    const { id } = await readBody(req);
    if (!/^[a-f0-9]{16}$/.test(id || '')) return json(res, 400, { error: 'Bad id.' });
    const state = await readState();
    state.acks[id] = new Date().toISOString();
    await writeState(state);
    return json(res, 200, { ok: true });
  }
  if (route === '/ack' && method === 'DELETE') {
    const state = await readState();
    state.acks = {};
    await writeState(state);
    return json(res, 200, { ok: true });
  }

  if (route === '/posts' && method === 'POST') {
    const { slug, title } = await readBody(req);
    if (!SLUG.test(slug || '')) return json(res, 400, { error: 'Slug must be lowercase words joined by hyphens.' });
    if (await findPost(slug)) return json(res, 409, { error: 'A post with that slug already exists.' });
    const today = new Date().toISOString().slice(0, 10);
    const fm = { title: title || 'Untitled post', dek: 'One-sentence summary of the post.', date: today, kicker: 'Essay', motif: 'paths', tags: [], draft: true };
    await fs.mkdir(FOLDERS.drafts, { recursive: true });
    const body = `import Exhibit from '../../components/blog/Exhibit.astro';\nimport Note from '../../components/blog/Note.astro';\n\n<p class="lede">Opening paragraph.</p>\n\n## First section\n\nWrite here.\n`;
    await fs.writeFile(path.join(FOLDERS.drafts, `${slug}.mdx`), serialisePost(fm, body), 'utf8');
    return json(res, 201, { slug, folder: 'drafts' });
  }

  const m = route.match(/^\/posts\/([^/]+)(\/move)?$/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    if (!SLUG.test(slug)) return json(res, 400, { error: 'Invalid slug.' });
    const found = await findPost(slug);
    if (!found) return json(res, 404, { error: 'Post not found.' });

    if (!m[2] && method === 'GET') {
      const { frontmatter, body } = parsePost(await fs.readFile(found.file, 'utf8'));
      if (frontmatter.date instanceof Date) frontmatter.date = frontmatter.date.toISOString().slice(0, 10);
      return json(res, 200, { slug, folder: found.folder, frontmatter, body, status: statusOf(found.folder, frontmatter, body), reviewFlags: reviewFlags(frontmatter, body) });
    }

    if (!m[2] && method === 'PUT') {
      const { frontmatter, body } = await readBody(req);
      if (typeof body !== 'string') return json(res, 400, { error: 'Body must be text.' });
      const [clean, errors] = validate(frontmatter || {});
      if (errors.length) return json(res, 422, { error: errors.join(' ') });
      await fs.writeFile(found.file, serialisePost(clean, body, await fs.readFile(found.file, 'utf8')), 'utf8');
      return json(res, 200, { ok: true, status: statusOf(found.folder, clean, body), reviewFlags: reviewFlags(clean, body) });
    }

    if (m[2] && method === 'POST') {
      const { to } = await readBody(req);
      if (!FOLDERS[to]) return json(res, 400, { error: 'Target must be "blog" or "drafts".' });
      if (to === found.folder) return json(res, 200, { ok: true, folder: to });
      await fs.mkdir(FOLDERS[to], { recursive: true });
      await fs.rename(found.file, path.join(FOLDERS[to], `${slug}.mdx`));
      return json(res, 200, { ok: true, folder: to });
    }

    if (!m[2] && method === 'DELETE') {
      await fs.mkdir(TRASH, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      await fs.rename(found.file, path.join(TRASH, `${slug}.${stamp}.mdx`));
      return json(res, 200, { ok: true });
    }
  }

  return json(res, 404, { error: 'Unknown endpoint.' });
}

export default function blogAdmin() {
  return {
    name: 'blog-admin',
    hooks: {
      'astro:server:setup': ({ server, logger }) => {
        Object.assign(process.env, loadEnv('development', ROOT, ''));
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url || '/', 'http://localhost');
          if (url.pathname !== '/admin' && url.pathname !== '/admin/' && !url.pathname.startsWith('/admin/api')) return next();
          if (!isLoopback(req.socket.remoteAddress)) return json(res, 403, { error: 'The admin is only available on this machine.' });
          try {
            if (url.pathname.startsWith('/admin/api')) return await handleApi(req, res, url);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('X-Frame-Options', 'DENY');
            res.end(await fs.readFile(ADMIN_HTML, 'utf8'));
          } catch (err) {
            json(res, err.status || 500, { error: err.message || 'Server error' });
          }
        });
        logger.info('Blog admin available at /admin (local only).');
      },
    },
  };
}
