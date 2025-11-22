import mammoth from 'mammoth';
import mime from 'mime-types';

function dedupLines(text) {
  const seen = new Set();
  const lines = String(text).split(/\r?\n/);
  const result = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const key = line.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(line);
    }
  }
  return result.join('\n');
}

function tryParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function dedupJson(value) {
  if (Array.isArray(value)) {
    const seen = new Set();
    const out = [];
    for (const item of value) {
      const key = typeof item === 'object' ? JSON.stringify(item, Object.keys(item).sort()) : String(item);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(dedupJson(item));
      }
    }
    return out;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = dedupJson(v);
    return out;
  }
  return value;
}

export async function parseBufferToText(buffer, originalName = '') {
  const ext = (originalName.split('.').pop() || '').toLowerCase();
  const mimeType = mime.lookup(originalName) || '';
  if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const { value } = await mammoth.extractRawText({ buffer });
    return value || '';
  }
  // default treat as utf-8 text
  return buffer.toString('utf8');
}

export function parseAndDedup(text) {
  const json = tryParseJSON(text);
  if (json) {
    const deduped = dedupJson(json);
    return { kind: 'json', deduped, text: JSON.stringify(deduped) };
  }
  const dedupedText = dedupLines(text);
  return { kind: 'text', deduped: dedupedText, text: dedupedText };
}
