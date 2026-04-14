// =============================================================================
// REVIEW ANALYSIS SERVICE  (backend/src/services/reviewAnalysis.js)
// =============================================================================
// Pure functions for:
//   1. Sentiment analysis  — keyword-weighted scoring (-1 to +1)
//   2. TF-IDF keyword extraction — identifies the most relevant terms
//   3. Quality score calculation — per the gamification spec
//   4. Keyword suggestions — context-aware prompts shown to the reviewer
//
// All functions are synchronous and dependency-free (uses `natural` npm pkg
// which is already installed, and falls back gracefully if it is missing).
// =============================================================================

// ---------------------------------------------------------------------------
// 0. Try to load `natural` for better NLP; fall back to basic mode if absent.
// ---------------------------------------------------------------------------
let natural = null;
try {
  natural = require('natural');
} catch (_) {
  console.warn('[ReviewAnalysis] `natural` package not found — using basic NLP fallback.');
}

// ---------------------------------------------------------------------------
// 1. SENTIMENT ANALYSIS
// ---------------------------------------------------------------------------

// Curated food-delivery–specific lexicon.
// Score range per word: -2 (very negative) to +2 (very positive).
// ── Spec-required positive words (all carry +2 weight) ──────────────────────
const SENTIMENT_LEXICON = {
  // ── Very positive (+2) ──────────────────────────────────────────────────
  excellent: 2, outstanding: 2, amazing: 2, phenomenal: 2, extraordinary: 2,
  delicious: 2, perfect: 2, fantastic: 2, superb: 2, incredible: 2,
  brilliant: 2, exceptional: 2, wonderful: 2, flawless: 2, spectacular: 2,
  'highly recommend': 2, 'must try': 2, 'best ever': 2,

  // ── Positive (+1) ───────────────────────────────────────────────────────
  good: 1, great: 1, nice: 1, tasty: 1, yummy: 1, fresh: 1, hot: 1,
  quick: 1, fast: 1, prompt: 1, helpful: 1, friendly: 1, clean: 1,
  recommend: 1, happy: 1, satisfied: 1, enjoyable: 1, pleasant: 1,
  love: 1, liked: 1, enjoyed: 1, 'on time': 1, 'well packaged': 1,
  value: 1, affordable: 1, generous: 1, crispy: 1, juicy: 1, flavourful: 1,

  // ── Neutral / filler — excluded from scoring (score = 0) ──────────────
  okay: 0, average: 0, decent: 0, alright: 0, fine: 0, ok: 0, normal: 0,

  // ── Negative (-1) ──────────────────────────────────────────────────────
  bad: -1, poor: -1, slow: -1, late: -1, cold: -1, wrong: -1, rude: -1, dirty: -1,
  overpriced: -1, bland: -1, soggy: -1, dry: -1, stale: -1, spicy: -1,
  missing: -1, disappointed: -1, unhappy: -1, mediocre: -1,
  'not good': -1, 'not fresh': -1,

  // ── Very negative (-2) ──────────────────────────────────────────────────
  terrible: -2, horrible: -2, awful: -2, disgusting: -2, worst: -2,
  pathetic: -2, unacceptable: -2, inedible: -2, rotten: -2, burnt: -2,
  'never again': -2, 'do not go': -2, 'waste of money': -2,
};

// Common negation words that flip sentiment.
const NEGATIONS = new Set(['not', 'no', "n't", 'never', 'neither', 'nor', 'without']);

/**
 * Analyse the sentiment of a review text.
 *
 * @param {string} text
 * @returns {{
 *   score: number,           // -1.0 (negative) to +1.0 (positive)
 *   label: 'positive'|'neutral'|'negative',
 *   magnitude: number,       // absolute strength of opinion 0–1
 *   tokenCount: number,
 *   positiveTerms: string[],
 *   negativeTerms: string[],
 * }}
 */
const analyseSentiment = (text) => {
  if (!text || typeof text !== 'string') {
    return { score: 0, label: 'neutral', magnitude: 0, tokenCount: 0, positiveTerms: [], negativeTerms: [] };
  }

  // Tokenise to lowercase words.
  const tokens = text.toLowerCase().match(/\b[\w']+\b/g) || [];
  let rawScore = 0;
  let wordCount = 0;
  const positiveTerms = [];
  const negativeTerms = [];

  // Check multi-word phrases first, then single tokens.
  const fullText = text.toLowerCase();

  // Multi-word phrase scan.
  for (const [phrase, weight] of Object.entries(SENTIMENT_LEXICON)) {
    if (phrase.includes(' ') && fullText.includes(phrase)) {
      rawScore += weight;
      if (weight > 0) positiveTerms.push(phrase);
      if (weight < 0) negativeTerms.push(phrase);
    }
  }

  // Single-word scan with negation window.
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const score = SENTIMENT_LEXICON[token];

    if (score === undefined) continue; // not in lexicon
    wordCount++;

    // Check if any of the 3 preceding tokens is a negation.
    const isNegated = tokens.slice(Math.max(0, i - 3), i).some((t) => NEGATIONS.has(t));
    const effectiveScore = isNegated ? -score : score;

    rawScore += effectiveScore;
    if (effectiveScore > 0) positiveTerms.push(token);
    if (effectiveScore < 0) negativeTerms.push(token);
  }

  // Normalise: divide by sqrt of token count to penalise short rants.
  const denominator = Math.max(Math.sqrt(tokens.length), 1);
  const normalised   = rawScore / denominator;

  // Clamp to [-1, +1].
  const score = Math.max(-1, Math.min(1, normalised / 3));
  const magnitude = Math.abs(score);

  let label;
  if      (score >= 0.2)  label = 'positive';
  else if (score <= -0.2) label = 'negative';
  else                    label = 'neutral';

  return {
    score:         Math.round(score * 100) / 100,
    label,
    magnitude:     Math.round(magnitude * 100) / 100,
    tokenCount:    tokens.length,
    positiveTerms: [...new Set(positiveTerms)],
    negativeTerms: [...new Set(negativeTerms)],
  };
};

// ---------------------------------------------------------------------------
// 2. TF-IDF KEYWORD EXTRACTION
// ---------------------------------------------------------------------------

// Common English stop words to ignore during extraction.
const STOP_WORDS = new Set([
  'i', 'me', 'my', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
  'to', 'for', 'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'it', 'its', 'this', 'that', 'these',
  'those', 'we', 'they', 'he', 'she', 'you', 'your', 'our', 'their', 'very',
  'so', 'just', 'also', 'not', 'no', 'as', 'if', 'then', 'than', 'more',
  'most', 'only', 'there', 'here', 'when', 'what', 'which',
  // Food review–specific filler
  'food', 'restaurant', 'place', 'time', 'order', 'ordered', 'got', 'get',
]);

/**
 * Extract the most relevant keywords from a review text using TF-IDF.
 * Uses `natural`'s TfIdf implementation when available, otherwise falls
 * back to term-frequency ranking.
 *
 * @param {string}   text   — the review body
 * @param {number}   topN   — how many keywords to return (default 10)
 * @returns {Array<{ term: string, score: number }>}
 */
const extractKeywords = (text, topN = 10) => {
  if (!text || text.length < 10) return [];

  if (natural) {
    // ── Use natural's TF-IDF implementation ────────────────────────────────
    const TfIdf    = natural.TfIdf;
    const tokenizer = new natural.WordTokenizer();
    const tfidf     = new TfIdf();

    tfidf.addDocument(text.toLowerCase());

    const results = [];
    tfidf.listTerms(0).forEach(({ term, tfidf: score }) => {
      if (!STOP_WORDS.has(term) && term.length > 2 && /^[a-z]+$/.test(term)) {
        results.push({ term, score: Math.round(score * 1000) / 1000 });
      }
    });

    return results.slice(0, topN);
  }

  // ── Fallback: raw term frequency ──────────────────────────────────────────
  const tokens = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const freq   = {};
  for (const token of tokens) {
    if (!STOP_WORDS.has(token)) freq[token] = (freq[token] || 0) + 1;
  }

  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([term, count]) => ({ term, score: count }));
};

// ---------------------------------------------------------------------------
// 3. QUALITY SCORE CALCULATION
// ---------------------------------------------------------------------------

/**
 * Calculate the gamified quality score for a review submission.
 * Max score: 100 points.
 *
 * Spec:
 *   Base:               10 pts
 *   Text multiplier:    10 × (length bucket multiplier)
 *   Photos:             +5 per photo, max 3 (= 15 pts)
 *   Video:              +10 pts
 *   Keywords (TF-IDF):  1-3 → +5, 4-6 → +10, 7+ → +15
 *   Timeliness:         within 2h → +10, within 24h → +5
 *
 * @param {{
 *   text:         string,
 *   photos:       string[],
 *   hasVideo:     boolean,
 *   orderDeliveredAt: Date|null,
 *   keywordCount: number,
 * }} params
 * @returns {{ score: number, breakdown: object }}
 */
const calculateQualityScore = ({
  text         = '',
  photos       = [],
  hasVideo     = false,
  orderDeliveredAt = null,
  keywordCount = 0,
}) => {
  const breakdown = {};

  // ── Base ──────────────────────────────────────────────────────────────────
  breakdown.base = 10;

  // ── Text length multiplier ────────────────────────────────────────────────
  const len = (text || '').trim().length;
  let multiplier;
  if      (len >= 200) multiplier = 3.0;
  else if (len >= 151) multiplier = 2.5;
  else if (len >= 101) multiplier = 2.0;
  else if (len >= 51)  multiplier = 1.5;
  else if (len >= 20)  multiplier = 1.0;
  else                 multiplier = 0.5; // too short — partial credit

  breakdown.textScore = Math.round(breakdown.base * multiplier);

  // ── Media bonus ───────────────────────────────────────────────────────────
  breakdown.photoBonus = Math.min((photos || []).length, 3) * 5;
  breakdown.videoBonus = hasVideo ? 10 : 0;

  // ── Keyword relevance bonus ───────────────────────────────────────────────
  if      (keywordCount >= 7) breakdown.keywordBonus = 15;
  else if (keywordCount >= 4) breakdown.keywordBonus = 10;
  else if (keywordCount >= 1) breakdown.keywordBonus = 5;
  else                        breakdown.keywordBonus = 0;

  // ── Timeliness bonus ─────────────────────────────────────────────────────
  if (orderDeliveredAt) {
    const hoursElapsed = (Date.now() - new Date(orderDeliveredAt).getTime()) / (1000 * 60 * 60);
    if      (hoursElapsed <= 2)  breakdown.timelinessBonus = 10;
    else if (hoursElapsed <= 24) breakdown.timelinessBonus = 5;
    else                         breakdown.timelinessBonus = 0;
  } else {
    breakdown.timelinessBonus = 0;
  }

  // ── Total ─────────────────────────────────────────────────────────────────
  const raw = breakdown.textScore + breakdown.photoBonus + breakdown.videoBonus
             + breakdown.keywordBonus + breakdown.timelinessBonus;

  breakdown.total = Math.min(raw, 100);

  return { score: breakdown.total, breakdown };
};

// ---------------------------------------------------------------------------
// 4. KEYWORD SUGGESTIONS (context-aware)
// ---------------------------------------------------------------------------

// Base suggestion banks by rating tier.
const SUGGESTION_BANKS = {
  positive: [
    'fresh ingredients', 'speedy delivery', 'well packaged', 'generous portion',
    'authentic taste', 'value for money', 'hot food', 'great presentation',
    'friendly service', 'would order again', 'crispy texture', 'flavourful',
    'hygienically packed', 'arrived early', 'perfectly cooked',
  ],
  neutral: [
    'average portion', 'decent taste', 'standard packaging', 'met expectations',
    'okay service', 'reasonable price', 'could improve', 'acceptable quality',
    'nothing special', 'average delivery time',
  ],
  negative: [
    'late delivery', 'cold food', 'missing item', 'poor packaging',
    'wrong order', 'overpriced', 'bland taste', 'small portion',
    'lukewarm', 'soggy', 'dry', 'poor quality',
  ],
};

/**
 * Generate context-aware keyword suggestions for the reviewer.
 *
 * @param {{
 *   rating:     number,     // 1–5
 *   orderItems: string[],   // item names from the order
 * }} params
 * @returns {string[]}        8–10 suggestion strings
 */
const generateKeywordSuggestions = ({ rating = 3, orderItems = [] }) => {
  // Pick sentiment bucket.
  let bank;
  if      (rating >= 4) bank = SUGGESTION_BANKS.positive;
  else if (rating <= 2) bank = SUGGESTION_BANKS.negative;
  else                  bank = SUGGESTION_BANKS.neutral;

  // Shuffle and pick 6 from the bank.
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  const fromBank = shuffled.slice(0, 6);

  // Add up to 3 item-specific tags based on the ordered items.
  const itemTags = (orderItems || [])
    .slice(0, 3)
    .map((item) => `${item.toLowerCase()} was ${rating >= 4 ? 'great' : rating <= 2 ? 'disappointing' : 'okay'}`);

  // Combine and return 8–10 unique suggestions.
  const combined = [...new Set([...itemTags, ...fromBank])];
  return combined.slice(0, 10);
};

// ---------------------------------------------------------------------------
// 5. SPAM & DUPLICATE DETECTION
// ---------------------------------------------------------------------------

/**
 * Generic/low-effort phrases that indicate a spam or filler review.
 * Presence of ≥2 of these in a short text triggers the spam flag.
 */
const GENERIC_PHRASES = [
  'good food', 'nice place', 'will visit again', 'recommended', 'okay', 'nice',
  'good', 'fine', 'ok', 'average', 'not bad', 'decent', 'great',
  'i liked it', 'pretty good', 'loved it', 'hate it', 'bad place',
];

/**
 * Compute Jaccard similarity between two texts.
 * Returns a value 0 (completely different) to 1 (identical).
 * Used to detect near-duplicate reviews by the same user.
 *
 * @param {string} textA
 * @param {string} textB
 * @returns {number}  0–1
 */
const computeSimilarity = (textA, textB) => {
  if (!textA || !textB) return 0;

  const tokenise = (t) => new Set(
    t.toLowerCase().match(/\b[a-z]{3,}\b/g) || []
  );

  const setA = tokenise(textA);
  const setB = tokenise(textB);

  const intersection = new Set([...setA].filter((w) => setB.has(w)));
  const union        = new Set([...setA, ...setB]);

  if (union.size === 0) return 0;
  return Math.round((intersection.size / union.size) * 100) / 100;
};

/**
 * Detect whether a review is likely spam or low-effort.
 *
 * Checks:
 *   a) Text too short (< 20 chars)   → isSpam
 *   b) ≥2 generic phrases in short text → isGeneric
 *   c) Similarity to a previous review > 80% → isDuplicate
 *
 * Rate-limiting (10 reviews/day) is enforced in the controller via a
 * DB count query — too stateful for a pure function here.
 *
 * @param {{
 *   text:              string,
 *   previousReviews:   string[],   // texts of user's recent submissions
 *   similarityThreshold: number,   // default 0.80
 * }} params
 * @returns {{
 *   isSpam:       bool,
 *   isGeneric:    bool,
 *   isDuplicate:  bool,
 *   similarityScore: number,       // highest similarity found
 *   flags:        string[],        // human-readable list of triggered flags
 * }}
 */
const detectSpam = ({ text, previousReviews = [], similarityThreshold = 0.80 }) => {
  const flags = [];
  const normalised = (text || '').trim();

  // ── a) Length check ───────────────────────────────────────────────────
  const isSpam = normalised.length < 20;
  if (isSpam) flags.push('TOO_SHORT');

  // ── b) Generic/filler check ───────────────────────────────────────────
  const lc = normalised.toLowerCase();
  const genericMatches = GENERIC_PHRASES.filter((p) => lc.includes(p));
  // Flag as generic only if the whole review is composed of generic phrases
  // — i.e., the review is short AND most of it is filler.
  const isGeneric = genericMatches.length >= 2 && normalised.length < 80;
  if (isGeneric) flags.push('GENERIC_CONTENT');

  // ── c) Duplicate similarity check ─────────────────────────────────────
  let similarityScore = 0;
  for (const prevText of previousReviews) {
    const sim = computeSimilarity(normalised, prevText);
    if (sim > similarityScore) similarityScore = sim;
  }
  const isDuplicate = similarityScore >= similarityThreshold;
  if (isDuplicate) flags.push(`DUPLICATE_SIMILARITY_${Math.round(similarityScore * 100)}%`);

  return { isSpam, isGeneric, isDuplicate, similarityScore, flags };
};

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------
module.exports = {
  analyseSentiment,
  extractKeywords,
  calculateQualityScore,
  generateKeywordSuggestions,
  detectSpam,
  computeSimilarity,
};
