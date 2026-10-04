/**
 * GenZ — Web-Grounded Research Copilot Agent
 * ===========================================
 * A standalone agent engine that enforces:
 *   1. Mandatory web-grounded research (Serper.dev search) before any answer.
 *   2. Step-by-step analytical workflow: Deconstruct -> Search -> Verify -> Deliver.
 *   3. Anti-hallucination guardrails (source-locked citations, URL audit, conflict flagging).
 *   4. OpenAI-compatible LLM synthesis (works with GPT-4o, Claude via compatible gateways,
 *      Ollama / LM Studio local models, etc.).
 *
 * Zero dependencies, pure ES2017+. Runs in the browser (exposes window.GenZ)
 * or Node.js (module.exports).
 *
 * SETUP
 * -----
 *   GenZ.configure({
 *     serperApiKey: "SERPER_KEY",              // https://serper.dev (free 2500 searches)
 *     llmApiKey:    "sk-...",                  // OpenAI-compatible key
 *     llmBaseUrl:   "https://api.openai.com/v1", // or http://localhost:11434/v1 (Ollama)
 *     llmModel:     "gpt-4o",                  // or "llama3.1"
 *   });
 *
 * CORS NOTE (browser-only deployments)
 * ------------------------------------
 * Serper and hosted LLM endpoints reject direct browser calls when no CORS headers
 * are sent. For a hosted app, set `proxyBase` to a tiny backend that forwards
 * `/search`, `/news` and `/chat` to the upstream providers:
 *
 *   GenZ.configure({ proxyBase: "https://api.your-host.com/genz" });
 *
 * For local-only prototyping, run the app through a CORS-friendly dev proxy
 * (e.g. `npx local-cors-proxy` for each upstream) and point llmBaseUrl/serper
 * accordingly. Keys routed through your own backend remain server-side.
 *
 * USAGE
 * -----
 *   const result = await GenZ.ask("What is the best value laptop under 60k INR in 2026?");
 *   console.log(result.answer);            // grounded markdown w/ Sources section
 *   console.log(result.citations.groundingScore); // 0..1 evidence coverage
 *   console.log(result.citations.unverifiedLinks); // URLs the LLM tried to invent
 *
 * Low-level tools are also exposed for manual building:
 *   GenZ.search(query, { type: "search" | "news" })
 *   GenZ.chat(messages, { json: true })
 */

"use strict";

const GENZ_SYSTEM_PROMPT = `# IDENTITY & PURPOSE
You are **GenZ**, an elite, super-intelligent generative AI engine and research copilot. Your core mission is to solve complex problems, answer every user inquiry with deep factual accuracy, and conduct live web-grounded analysis.

---

# CORE DIRECTIVES & OPERATING PRINCIPLES

1. **Mandatory Web Analysis & Grounding:**
   - For any factual query, current event, statistical request, technical documentation lookup, or comparative analysis, you MUST trigger the web search tool before drafting an answer.
   - Cross-examine multiple reliable web sources. Do not depend on single unverified snippets.
   - If user queries reference changing real-world states (e.g., current events, market data, prices, software updates), always ground the response in live web data rather than static memory.

2. **Super-Intelligent Analytical Workflow:**
   - **Deconstruct:** Break ambiguous or multi-layered questions into core components.
   - **Search & Synthesize:** Execute targeted, keyword-dense search queries to retrieve relevant pages.
   - **Verify:** Reconcile conflicting reports across search hits. Flag dates to ensure you are not using outdated archives.
   - **Deliver:** Provide direct, comprehensive, and insight-dense conclusions.

3. **Tone & Style:**
   - **Authoritative & Sharp:** Direct, articulate, objective, and intellectually rigorous.
   - **Zero Fluff:** Omit filler openers ("Sure! As an AI...", "Here is what I found:"). Start directly with the answer in sentence 1.
   - **Structured Formatting:** Use clear headings, itemized bullet points, and markdown tables for complex comparisons or structured data.

4. **Hallucination Prevention & Integrity Guardrails:**
   - Never extrapolate, invent URLs, or make unverified claims.
   - When conflicting data exists on the web, highlight the discrepancy transparently.
   - Always synthesize retrieved facts into original prose—do not copy long raw snippets verbatim.

---

# TOOL USE SPECIFICATION (WEB SEARCH)

- Trigger \`web_search\` using precise, Boolean-style keyword queries (e.g., \`[subject] latest updates 2026\`, \`[entity] specifications official documentation\`).
- If initial results are vague or insufficient, execute a refined secondary search before formulating your final answer.
- Always attribute claims to the specific sources, domains, or organizations identified during search.`;

const ANALYZER_SYSTEM_PROMPT = `You are the research-planner module of GenZ, a web-grounded research agent. Your ONLY job is to deconstruct a user question and emit a JSON research plan. Do NOT answer or speculate on the question itself.

Emit JSON matching exactly this schema:
{
  "topics": ["independent core components that must each be verified"],
  "queries": ["3 to 6 Boolean-style, keyword-dense search queries"],
  "isTimeSensitive": true
}

Rules:
- isTimeSensitive must be true when the correct answer depends on live/changing data (prices, market data, product releases, software versions, news, events, reviews, availability).
- queries must use quoted phrases and minimal filler words; add site: qualifiers only for clearly authoritative domains when useful.
- topics must be short and discrete.`;

const DEFAULTS = {
  serperApiKey: null,
  llmApiKey: null,
  llmBaseUrl: "https://api.openai.com/v1",
  llmModel: "gpt-4o",
  searchResults: 10,
  newsResults: 8,
  timeoutMs: 45000,
  proxyBase: null,
  temperature: 0.2,
  gl: "in",
  hl: "en",
};

const SERPER_ENDPOINTS = {
  search: "https://google.serper.dev/search",
  news: "https://google.serper.dev/news",
};

const GenZ = (() => {
  const config = { ...DEFAULTS };

  // ---------------- Config ----------------
  function configure(cfg) {
    Object.assign(config, DEFAULTS, cfg || {});
    return getConfig();
  }

  function getConfig() {
    return { ...config };
  }

  function assertProviderReady() {
    const errors = [];
    if (!config.serperApiKey && !config.proxyBase) {
      errors.push("serperApiKey is required for web-grounded research (or set proxyBase).");
    }
    if (!config.llmApiKey && !config.proxyBase) {
      errors.push("llmApiKey is required for synthesis (or set proxyBase).");
    }
    return errors;
  }

  // ---------------- Low-level HTTP ----------------
  function endpoint(kind, type = "search") {
    if (config.proxyBase) {
      return `${config.proxyBase.replace(/\/$/, "")}/${kind === "llm" ? "chat" : type}`;
    }
    if (kind === "llm") {
      return `${config.llmBaseUrl.replace(/\/$/, "")}/chat/completions`;
    }
    return SERPER_ENDPOINTS[type] || SERPER_ENDPOINTS.search;
  }

  async function request(url, body, headers = {}, method = "POST") {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} from ${url}${text ? ` — ${text.slice(0, 300)}` : ""}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function serperSearch(query, opts = {}) {
    const type = opts.type === "news" ? "news" : "search";
    const num = opts.num || (type === "news" ? config.newsResults : config.searchResults);
    const headers = {};
    if (!config.proxyBase) headers["X-API-KEY"] = config.serperApiKey;
    return request(endpoint("search", type), { q: query, num, gl: config.gl, hl: config.hl }, headers);
  }

  async function openaiChat(messages, opts = {}) {
    const body = {
      model: config.llmModel,
      messages,
      temperature: opts.temperature ?? config.temperature,
    };
    if (opts.json) body.response_format = { type: "json_object" };
    const headers = {};
    if (!config.proxyBase) headers["Authorization"] = `Bearer ${config.llmApiKey}`;
    const raw = await request(endpoint("llm"), body, headers);
    const content = raw && raw.choices && raw.choices[0] && raw.choices[0].message && raw.choices[0].message.content;
    if (!content) throw new Error("LLM returned no assistant content.");
    return content;
  }

  // ---------------- Step 1: Deconstruct ----------------
  const TIME_SENSITIVE_HINTS = /(current|latest|now|today|price|cost|rate|release|update|version|review|news|market|stock|weather|score|2025|2026)\b/i;

  function fallbackDeconstruct(question) {
    const isTimeSensitive = TIME_SENSITIVE_HINTS.test(question);
    return {
      topics: [question],
      queries: [question, `${question} 2026`],
      isTimeSensitive,
    };
  }

  async function deconstruct(question) {
    const errors = assertProviderReady();
    if (errors.length) return fallbackDeconstruct(question);
    const userMessage =
      `Today: ${new Date().toISOString().slice(0, 10)}\n\n` +
      `Deconstruct this question into a JSON research plan:\n"${question}"`;
    try {
      const text = await openaiChat(
        [
          { role: "system", content: ANALYZER_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        { json: true }
      );
      const plan = JSON.parse(extractJson(text));
      const topics = Array.isArray(plan.topics) && plan.topics.length ? plan.topics : [question];
      const queries = Array.isArray(plan.queries) && plan.queries.length ? plan.queries : [question];
      return {
        topics,
        queries,
        isTimeSensitive: !!plan.isTimeSensitive,
      };
    } catch (e) {
      return fallbackDeconstruct(question);
    }
  }

  // ---------------- Step 2: Search & Gather ----------------
  async function research(plan) {
    const searches = [];
    const uniqueQueries = [...new Set(plan.queries.map((q) => q.trim()).filter(Boolean))];
    for (const q of uniqueQueries) {
      searches.push({ q, type: "search" });
      if (plan.isTimeSensitive) searches.push({ q, type: "news" });
    }
    const outcomes = await Promise.allSettled(
      searches.map((s) => serperSearch(s.q, { type: s.type }))
    );

    const items = [];
    outcomes.forEach((o, i) => {
      if (o.status !== "fulfilled") return;
      const data = o.value || {};
      const isNews = searches[i].type === "news";
      const organic = (isNews ? data.news : data.organic) || [];
      organic.forEach((r) => {
        if (!r || !r.link) return;
        items.push({
          id: items.length + 1,
          title: r.title || r.link,
          link: r.link,
          snippet: (r.snippet || r.description || "").replace(/\s+/g, " ").trim(),
          source: hostnameOf(r.link),
          date: r.date || null,
          fresh: isNews,
        });
      });
    });

    const dedup = new Map();
    for (const it of items.sort((a, b) => (b.fresh && !a.fresh ? 1 : 0))) {
      const key = normalizeUrl(it.link);
      if (!dedup.has(key)) dedup.set(key, it);
    }
    return {
      searches,
      items: [...dedup.values()],
      isTimeSensitive: plan.isTimeSensitive,
      topics: plan.topics,
    };
  }

  // ---------------- Step 2b: Corpus selection ----------------
  function buildCorpus(gathered) {
    const items = gathered.items
      .filter((it) => it.title && it.snippet) // keep only readable evidence
      .slice(0, 40)
      .map((it, i) => ({ ...it, id: i + 1 }));
    if (items.length < 6) {
      // relax snippet filter if evidence is thin
      return gathered.items
        .filter((it) => it.title || it.link)
        .slice(0, 40)
        .map((it, i) => ({ ...it, id: i + 1 }));
    }
    return items;
  }

  // ---------------- Step 3: Verify & Deliver (grounded synthesis) ----------------
  const GROUNDING_CONTRACT = (question, corpus, today) => `# GROUNDING CONTRACT
You are answering as GenZ. Obey every directive in your system prompt, plus:
- Today's date: ${today}
- Base your answer EXCLUSIVELY on the WEB EVIDENCE below. This evidence is the only reality you may reference.
- Cite sources inline as [n] matching the numbered evidence list, and end with a "### Sources" section listing only real URLs from the evidence.
- NEVER fabricate URLs, statistics, names, dates, or citations. If a fact is not in the evidence, do not assert it.
- If the evidence reports conflicting numbers or claims, TRANSPARENTLY flag the discrepancy and present both versions with their source ids.
- If the evidence is insufficient to answer, say so directly: "Insufficient web evidence to verify..." and state what is missing. Do not guess.
- Synthesize facts into original prose. Do not copy long raw snippets verbatim.

# QUESTION
${question}

# WEB EVIDENCE
${corpus
  .map(
    (c) =>
      `[${c.id}] (${c.source}) ${c.title} — ${c.link}\n    ${c.snippet}${c.date ? `\n    [dated: ${c.date}]` : ""}`
  )
  .join("\n\n")}`;

  async function synthesize(question, corpus, opts = {}) {
    const today = new Date().toISOString().slice(0, 10);
    const outline = (opts.topics && opts.topics.length ? `\nAnswer these facets explicitly: ${opts.topics.join(" | ")}.` : "");
    const messages = [
      { role: "system", content: GENZ_SYSTEM_PROMPT },
      { role: "user", content: GROUNDING_CONTRACT(question, corpus, today) + outline },
    ];
    return openaiChat(messages, opts);
  }

  // ---------------- Anti-hallucination auditor ----------------
  function hostnameOf(u) {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch (e) {
      return "";
    }
  }

  function normalizeUrl(u) {
    try {
      const x = new URL(u);
      x.hash = "";
      for (const p of [...x.searchParams.keys()]) {
        if (p.toLowerCase().startsWith("utm_")) x.searchParams.delete(p);
      }
      return x.href.replace(/\/+$/, "").toLowerCase();
    } catch (e) {
      return u ? String(u).replace(/\/+$/, "").toLowerCase() : "";
    }
  }

  function extractUrls(text) {
    const out = new Set();
    const re = /https?:\/\/[^\s)\]]+/g;
    let m;
    while ((m = re.exec(text))) {
      const clean = m[0].replace(/[.,;:!?]+$/, "").replace(/[)\]}>]+$/, "");
      if (clean) out.add(clean);
    }
    return [...out];
  }

  function detectConflicts(answer) {
    const flags = [];
    const lines = answer.split("\n");
    lines.forEach((line, i) => {
      if (/discrepanc|discrepancies|conflict(ing|s)?\b|reports differ|sources disagree/i.test(line)) {
        flags.push({ line: i + 1, text: line.trim().slice(0, 200) });
      }
    });
    return flags;
  }

  function auditCitations(answer, corpus) {
    const corpusSet = new Map(corpus.map((c) => [normalizeUrl(c.link), c]));
    const answerUrls = extractUrls(answer);
    const cited = [];
    const unverified = [];
    for (const u of answerUrls) {
      const key = normalizeUrl(u);
      if (corpusSet.has(key)) cited.push(u);
      else unverified.push(u);
    }
    const citedCount = cited.length;
    const groundingScore = citedCount
      ? Math.min(1, citedCount / Math.max(citedCount + unverified.length, 1))
      : 0;
    const warnings = [];
    if (unverified.length) {
      warnings.push(`Answer cites ${unverified.length} URL(s) not present in the research evidence — flagged for hallucination review: ${unverified.join(", ")}`);
    }
    if (!citedCount) {
      warnings.push("Answer contained zero verified citations — treat as low grounding.");
    }
    return { corpora: corpus.length, citedUrls: cited, unverifiedLinks: unverified, groundingScore, warnings };
  }

  // ---------------- Orchestration ----------------
  async function ask(question, opts = {}) {
    const results = {
      status: "error",
      query: question,
      answer: "",
      summary: "",
      sources: [],
      citations: null,
      conflicts: [],
      trace: {},
      errors: [],
    };

    if (!question || typeof question !== "string" || !question.trim()) {
      results.errors.push("No question provided.");
      return results;
    }
    const errors = assertProviderReady();
    if (errors.length) {
      results.errors.push(...errors);
      return results;
    }
    const onStep = typeof opts.onStep === "function" ? opts.onStep : () => {};

    // 1. Deconstruct
    onStep({ stage: "deconstruct", message: "Deconstructing question into research facets..." });
    const plan = await deconstruct(question);
    results.trace.facets = plan;

    // 2. Search (mandatory before drafting)
    onStep({ stage: "search", message: "Executing web-grounded search queries..." });
    let gathered;
    try {
      gathered = await research(plan);
      results.trace.searches = gathered.searches;
    } catch (e) {
      results.errors.push(`Search failed: ${e.message}`);
      return results;
    }

    const corpus = buildCorpus(gathered);
    results.sources = corpus;
    if (!corpus.length) {
      results.status = "insufficient-evidence";
      results.answer =
        "Insufficient web evidence returned to ground an answer. No reliable search results could be retrieved for this query. Provide a working search key/proxy or rephrase the query.";
      results.citations = auditCitations(results.answer, corpus);
      return results;
    }

    // 3. Verify & Deliver
    onStep({ stage: "synthesize", message: "Synthesizing evidence under grounding contract..." });
    try {
      const answer = await synthesize(question, corpus, {
        temperature: opts.temperature,
        topics: opts.topics || plan.topics,
        json: false,
      });
      onStep({ stage: "audit", message: "Auditing citations against research evidence..." });
      results.answer = answer;
      results.summary = summarize(answer);
      results.citations = auditCitations(answer, corpus);
      results.conflicts = detectConflicts(answer);
      const audited = results.citations;
      results.status =
        audited.groundingScore >= 1 && audited.citedUrls.length > 0 ? "grounded" : "low-grounding";
    } catch (e) {
      results.errors.push(`Synthesis failed: ${e.message}`);
      results.status = "error";
      return results;
    }

    return results;
  }

  function summarize(answer) {
    const clean = answer.replace(/\*\*/g, "").replace(/#+\s*/g, "");
    const first = clean.split(/\n{2,}/).find((p) => p.trim().length > 40);
    const text = first ? first.trim() : clean.trim();
    return text.length > 400 ? text.slice(0, 397).trimEnd() + "…" : text;
  }

  // ---------------- Helpers ----------------
  function extractJson(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON object in LLM response.");
    return text.slice(start, end + 1);
  }

  async function chat(messages, opts = {}) {
    return openaiChat(messages, opts);
  }

  async function search(query, opts = {}) {
    return serperSearch(query, opts);
  }

  return {
    GENZ_SYSTEM_PROMPT,
    configure,
    getConfig,
    ask,
    chat,
    search,
    deconstruct,
    research,
    buildCorpus,
    synthesize,
    auditCitations,
  };
})();

if (typeof window !== "undefined") {
  window.GenZ = GenZ;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = GenZ;
}