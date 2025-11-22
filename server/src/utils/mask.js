// PII masking utilities

const patterns = {
  email: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
  phone: /\b(?:\+?\d{1,3}[ -]?)?(?:\(\d{2,4}\)[ -]?)?\d{3,5}[ -]?\d{3,5}[ -]?\d{0,4}\b/g,
  ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  ipv6: /\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\b/g,
  timestamp: /\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/g,
  creditCard: /\b(?:\d[ -]*?){13,19}\b/g,
  jwt: /\beyJ[\w-]+?\.[\w-]+?\.[\w-]+\b/g,
  apiKey: /(?:(?:api|secret|token|key|password)[ _-]?(?:id|key|token)?)["'=: ]+([A-Za-z0-9_\-]{16,})/gi,
  bearer: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
};

function maskValue(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(patterns.email, '[EMAIL]')
    .replace(patterns.phone, '[PHONE]')
    .replace(patterns.ip, '[IP]')
    .replace(patterns.ipv6, '[IPV6]')
    .replace(patterns.timestamp, '[TIMESTAMP]')
    .replace(patterns.jwt, '[JWT]')
    .replace(patterns.bearer, 'Bearer [TOKEN]')
    .replace(patterns.apiKey, '[API_KEY]')
    .replace(patterns.creditCard, '[CARD]');
}

export function maskText(input) {
  if (!input) return '';
  return maskValue(String(input));
}

export function maskJson(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return maskText(obj);
  if (Array.isArray(obj)) return obj.map(maskJson);
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string') out[k] = maskText(v);
      else if (typeof v === 'object') out[k] = maskJson(v);
      else out[k] = v;
    }
    return out;
  }
  return obj;
}
