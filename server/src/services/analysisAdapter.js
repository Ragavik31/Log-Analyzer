import axios from 'axios';
import { env } from '../config/env.js';

const client = axios.create({
  baseURL: 'https://api.deepseek.com/v1',
  timeout: env.REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
  },
});

const systemPrompt = `You are a log analysis assistant. Given logs, respond as strict JSON with keys: severity (one of: info, low, medium, high, critical), root_cause, proposed_solution. Be concise but specific.`;

export function heuristicAnalyze(text) {
  const t = (text || '').toLowerCase();
  const counts = {
    error: (t.match(/\berror\b/g) || []).length,
    exception: (t.match(/\bexception\b/g) || []).length,
    failed: (t.match(/\bfailed|failure\b/g) || []).length,
    timeout: (t.match(/\btimeout\b/g) || []).length,
    warn: (t.match(/\bwarn(ing)?\b/g) || []).length,
    declined: (t.match(/\bdeclined\b/g) || []).length,
    rateLimit: (t.match(/rate limit|429 too many requests|too many requests/gi) || []).length,
    sqlInjection: (t.match(/sql injection|union select|drop table/gi) || []).length,
    unavailable: (t.match(/service unavailable|503 service unavailable|temporarily unavailable/gi) || []).length,
    authError: (t.match(/unauthorized|forbidden|bad credentials|invalid token|authentication failed/gi) || []).length,
  };
  const score =
    counts.error * 3 +
    counts.exception * 3 +
    counts.failed * 2 +
    counts.timeout * 2 +
    counts.warn +
    counts.declined * 2 +
    counts.rateLimit * 2 +
    counts.sqlInjection * 3 +
    counts.unavailable * 2 +
    counts.authError * 2;
  let severity = 'info';
  if (score >= 12) severity = 'critical';
  else if (score >= 8) severity = 'high';
  else if (score >= 4) severity = 'medium';
  else if (score >= 1) severity = 'low';

  let root = '';
  if (counts.sqlInjection) {
    root = 'Potential SQL injection or malicious query pattern detected in this log entry.';
  } else if (counts.rateLimit) {
    root = 'Rate limit exceeded for this request or API key (HTTP 429 / Too Many Requests).';
  } else if (counts.declined) {
    root = 'Operation or payment was declined for this request.';
  } else if (counts.authError) {
    root = 'Authentication or authorization failure detected in this log entry.';
  } else if (counts.exception || counts.error) {
    root = 'Error or exception detected in this log entry.';
  } else if (counts.unavailable) {
    root = 'Service or dependency unavailable (for example, HTTP 503 Service Unavailable).';
  } else if (counts.timeout) {
    root = 'Timeout detected in this log entry, likely due to network or database latency.';
  } else if (counts.failed) {
    root = 'Operation failed in this log entry. Upstream or downstream component may be unhealthy.';
  } else if (counts.warn) {
    root = 'Warning log entry indicating a potential but non-critical issue.';
  } else {
    root = 'Informational log entry; no obvious error keywords detected.';
  }

  const solution = [
    counts.timeout ? '- Increase timeouts, add retries with backoff, verify network/DB availability.' : null,
    counts.error || counts.exception ? '- Inspect stack traces for failing components and recent deployments.' : null,
    counts.failed ? '- Add guards and input validation; verify external service dependencies.' : null,
    '- Enable structured logging and tracing to pinpoint failing requests.',
  ].filter(Boolean).join('\n');

  return { severity, root_cause: root, proposed_solution: solution };
}

async function analyzeWithDeepseek(maskedText) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Analyze the following logs and return JSON.\n\n${maskedText}` },
  ];
  const { data } = await client.post('/chat/completions', {
    model: env.DEEPSEEK_MODEL,
    messages,
    temperature: 0.2,
  });
  const content = data?.choices?.[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    return { severity: 'medium', root_cause: content?.slice(0, 500) || '', proposed_solution: '' };
  }
}

export async function analyzeLogs(maskedText) {
  const provider = env.ANALYSIS_PROVIDER || 'deepseek';

  // Pure heuristic mode or missing API key: do not call DeepSeek at all
  if (provider === 'heuristic' || !env.DEEPSEEK_API_KEY) {
    const fallback = heuristicAnalyze(maskedText);
    return { ...fallback, raw: { provider: 'heuristic' } };
  }

  try {
    return await analyzeWithDeepseek(maskedText);
  } catch (e) {
    // Map DeepSeek errors (e.g., 401/402/quota/timeout) to a graceful fallback result
    const fallback = heuristicAnalyze(maskedText);
    return { ...fallback, raw: { provider: 'deepseek', error: e?.message || String(e) } };
  }
}
