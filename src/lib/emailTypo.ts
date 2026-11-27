// Suggests a fix for common email-domain typos ("icloud.con" -> "icloud.com").
// Seen in real sign-ups: icloud.con, ivloud.com. A typo means the login code never arrives.

const KNOWN_DOMAINS = [
  'gmail.com', 'icloud.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com',
  'me.com', 'rocketmail.com', 'ymail.com', 'mweb.co.za', 'telkomsa.net',
  'webmail.co.za', 'vodamail.co.za', 'absamail.co.za', 'yahoo.co.za', 'gmail.co.za',
];

function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Returns the corrected full address, or null when the domain looks fine or unknown. */
export function suggestEmailFix(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at < 1) return null;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!domain || KNOWN_DOMAINS.includes(domain)) return null;

  let best: string | null = null;
  let bestScore = Infinity;
  for (const known of KNOWN_DOMAINS) {
    const d = distance(domain, known);
    if (d < bestScore) { bestScore = d; best = known; }
  }
  // Two edits catches "gmial.con"; short domains get one so "me.co" isn't forced anywhere odd.
  const limit = domain.length <= 6 ? 1 : 2;
  return best && bestScore <= limit ? `${local}@${best}` : null;
}
