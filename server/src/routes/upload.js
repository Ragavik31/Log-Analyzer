import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { parseBufferToText, parseAndDedup } from '../utils/parse.js';
import { maskJson, maskText } from '../utils/mask.js';
import { hashString, stableStringify } from '../utils/hash.js';

const router = Router();

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const text = await parseBufferToText(req.file.buffer, req.file.originalname);
    const { kind, deduped, text: normalized } = parseAndDedup(text);
    const masked = kind === 'json' ? maskJson(deduped) : maskText(normalized);
    const maskedText = kind === 'json' ? stableStringify(masked) : String(masked);
    const contentHash = hashString(maskedText);
    res.json({ kind, preview: masked, maskedText, contentHash });
  } catch (e) {
    next(e);
  }
});

export default router;
