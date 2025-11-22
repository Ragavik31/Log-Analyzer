import { Router } from 'express';
import { AnalysisModel } from '../models/Analysis.js';
import { analyzeLogs, heuristicAnalyze } from '../services/analysisAdapter.js';
import { maskJson, maskText } from '../utils/mask.js';
import { parseAndDedup } from '../utils/parse.js';
import { hashString, stableStringify } from '../utils/hash.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const t0 = Date.now();
    // start log
    // eslint-disable-next-line no-console
    console.log('[analyze] start');
    const { content, kind, perLine } = req.body || {};
    if (!content) return res.status(400).json({ error: 'content is required' });

    let maskedText = '';
    let preview = null;

    if (kind === 'json') {
      const { deduped } = parseAndDedup(JSON.stringify(content));
      const masked = maskJson(deduped);
      preview = masked;
      maskedText = stableStringify(masked);
    } else {
      const { text } = parseAndDedup(String(content));
      if (perLine) {
        // Per-line analysis path (text only)
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const results = [];
        for (const l of lines) {
          const maskedLine = maskText(l);
          const lineHash = hashString(String(maskedLine));
          let cachedLine = null;
          try { cachedLine = await AnalysisModel.findOne({ hash: lineHash }).lean(); } catch {}
          if (cachedLine?.result) {
            // Skip purely informational cached lines
            if (cachedLine.result.severity !== 'info') {
              results.push({ line: maskedLine, contentHash: lineHash, result: { ...cachedLine.result }, fromCache: true });
            }
            continue;
          }
          // Use heuristic for per-line to keep it fast and avoid API cost
          const hres = heuristicAnalyze(maskedLine);
          // Only store and return lines that look like issues (non-info severity)
          if (hres.severity !== 'info') {
            try { await AnalysisModel.create({ hash: lineHash, inputPreview: maskedLine, maskedPayload: maskedLine, result: { ...hres, raw: { provider: 'heuristic' } } }); } catch {}
            results.push({ line: maskedLine, contentHash: lineHash, result: hres, fromCache: false });
          }
        }
        // Overall summary from entire text as well
        const overall = heuristicAnalyze(text);
        // eslint-disable-next-line no-console
        console.log('[analyze] perLine done', results.length, 'lines in', Date.now() - t0, 'ms');
        return res.json({ perLine: true, lines: results, summary: overall });
      }
      preview = maskText(text);
      maskedText = String(preview);
    }

    const contentHash = hashString(maskedText);

    // cache lookup
    let cached = null;
    try {
      cached = await AnalysisModel.findOne({ hash: contentHash }).lean();
    } catch {}

    if (cached?.result) {
      // eslint-disable-next-line no-console
      console.log('[analyze] cache hit', contentHash.slice(0, 10), 'in', Date.now() - t0, 'ms');
      return res.json({ fromCache: true, contentHash, preview, result: { ...cached.result, fromCache: true } });
    }

    const result = await analyzeLogs(maskedText);

    // save cache (best-effort)
    try {
      await AnalysisModel.create({ hash: contentHash, inputPreview: preview, maskedPayload: maskedText, result });
    } catch {}

    // eslint-disable-next-line no-console
    console.log('[analyze] done', contentHash.slice(0, 10), 'in', Date.now() - t0, 'ms');
    res.json({ fromCache: false, contentHash, preview, result });
  } catch (e) {
    next(e);
  }
});

export default router;
