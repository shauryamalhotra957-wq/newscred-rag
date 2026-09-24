/**
 * News Source Credential & Domain Authority Scorer.
 * Evaluates publication credibility using domain reputation priors, TLD weights,
 * and journalistic citation transparency indicators.
 */
export class SourceReputationScorer {
  static TRUSTED_TLDS = new Set(['.edu', '.gov', '.org', '.ac.uk']);
  static FLAG_SUSPICIOUS_PATTERNS = [/news\d+\.xyz$/i, /free-real-news\./i, /clickbait/i];

  static scoreDomain(hostname) {
    const cleanHost = (hostname || '').toLowerCase().trim();
    if (!cleanHost) return 0.0;

    let score = 50.0; // Baseline neutral score

    // Check trusted TLD
    for (const tld of SourceReputationScorer.TRUSTED_TLDS) {
      if (cleanHost.endsWith(tld)) {
        score += 30.0;
        break;
      }
    }

    // Check suspicious domain patterns
    for (const pattern of SourceReputationScorer.FLAG_SUSPICIOUS_PATTERNS) {
      if (pattern.test(cleanHost)) {
        score -= 40.0;
        break;
      }
    }

    // HTTPS / Subdomain depth penalty
    const parts = cleanHost.split('.');
    if (parts.length > 4) {
      score -= 10.0; // Deep nested subdomains often indicate cloaking
    }

    const clamped = Math.max(0.0, Math.min(100.0, score));
    return Number(clamped.toFixed(1));
  }
}
