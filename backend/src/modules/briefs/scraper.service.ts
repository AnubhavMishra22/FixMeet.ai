import * as cheerio from 'cheerio';
import type { PersonInfo, CompanyInfo, LinkedInResult } from './scraper.types.js';

const SCRAPE_TIMEOUT = 10_000; // 10 seconds
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract domain from an email address (e.g. "john@stripe.com" → "stripe.com") */
function extractDomain(email: string): string {
  const parts = email.split('@');
  return parts[parts.length - 1]!.toLowerCase();
}

/** Free-email providers where the domain tells us nothing about the company */
const FREE_EMAIL_PROVIDERS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mail.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'fastmail.com',
]);

/**
 * Fetch a URL with timeout and return the HTML body, or null on failure.
 * Uses Node 20+ native fetch with AbortController for timeout.
 */
async function fetchHtml(
  url: string,
  extraHeaders?: Record<string, string>,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        ...extraHeaders,
      },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) return null;

    // Limit body to 2MB to avoid huge pages
    const text = await response.text();
    return text.length > 2 * 1024 * 1024 ? text.slice(0, 2 * 1024 * 1024) : text;
  } catch (err) {
    console.log(`[scraper] Failed to fetch ${url}:`, (err as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Safely fetch a page and return cheerio-parsed HTML, or null on failure */
async function fetchPage(url: string): Promise<cheerio.CheerioAPI | null> {
  const html = await fetchHtml(url);
  return html ? cheerio.load(html) : null;
}

/** Extract clean text from a string, trimming and collapsing whitespace */
function cleanText(text: string | undefined | null): string | null {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** Truncate text to a max length, adding ellipsis if needed */
function truncate(text: string | null, maxLen: number): string | null {
  if (!text) return null;
  return text.length > maxLen ? text.slice(0, maxLen - 3) + '...' : text;
}

// ---------------------------------------------------------------------------
// searchCompanyInfo
// ---------------------------------------------------------------------------

/**
 * Fetch a company website homepage and extract meta info.
 * Returns partial data if some fields can't be extracted.
 */
export async function searchCompanyInfo(domain: string): Promise<CompanyInfo> {
  const result: CompanyInfo = {
    domain,
    name: null,
    description: null,
    industry: null,
  };

  const $ = await fetchPage(`https://${domain}`);
  if (!$) return result;

  // Company name: prefer og:site_name, then <title>
  result.name =
    cleanText($('meta[property="og:site_name"]').attr('content')) ??
    cleanText($('meta[name="application-name"]').attr('content')) ??
    cleanText($('title').first().text());

  // Strip common suffixes from title-based names
  if (result.name) {
    result.name = result.name
      .replace(/\s*[|–-]\s*Home\s*$/i, '')
      .replace(/\s*[|–-]\s*Official Site\s*$/i, '')
      .replace(/\s*[|–-]\s*Welcome\s*$/i, '')
      .trim();
  }

  // Description: prefer meta description, then og:description
  result.description = truncate(
    cleanText($('meta[name="description"]').attr('content')) ??
      cleanText($('meta[property="og:description"]').attr('content')),
    500,
  );

  // Industry: check meta keywords for hints (best-effort)
  const keywords = cleanText($('meta[name="keywords"]').attr('content'));
  if (keywords) {
    result.industry = truncate(keywords, 200);
  }

  return result;
}

// ---------------------------------------------------------------------------
// searchLinkedIn
// ---------------------------------------------------------------------------

/**
 * Search Google for a LinkedIn profile matching the person + company.
 * Returns the first LinkedIn profile URL found, or null.
 * Note: We only extract the URL from search results — we don't scrape LinkedIn itself.
 */
export async function searchLinkedIn(
  name: string,
  company: string | null,
): Promise<LinkedInResult | null> {
  try {
    const query = company
      ? `site:linkedin.com/in ${name} ${company}`
      : `site:linkedin.com/in ${name}`;

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=3`;

    const html = await fetchHtml(searchUrl);
    if (!html) return null;

    const $ = cheerio.load(html);

    // Look for LinkedIn URLs in search result links
    let linkedinUrl: string | null = null;

    $('a[href]').each((_, el) => {
      if (linkedinUrl) return; // already found one

      const href = $(el).attr('href') ?? '';

      // Google wraps links in /url?q=... or the href is direct
      const match =
        href.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/) ??
        href.match(/\/url\?q=(https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+)/);

      if (match) {
        linkedinUrl = match[1] ?? match[0]!;
      }
    });

    if (linkedinUrl) {
      return { linkedinUrl };
    }

    return null;
  } catch (err) {
    console.log(`[scraper] LinkedIn search failed:`, (err as Error).message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// searchPersonInfo
// ---------------------------------------------------------------------------

/**
 * Gather info about a person from their name + email.
 * - Extracts domain from email
 * - Fetches company website info (if not a free email provider)
 * - Searches for LinkedIn profile
 * Returns partial data if any individual lookup fails.
 */
export async function searchPersonInfo(name: string, email: string): Promise<PersonInfo> {
  const domain = extractDomain(email);
  const isFreeEmail = FREE_EMAIL_PROVIDERS.has(domain);

  const result: PersonInfo = {
    name,
    email,
    domain,
    companyName: null,
    companyDescription: null,
    linkedinUrl: null,
  };

  // Run company lookup and LinkedIn search in parallel
  const [companyInfo, linkedIn] = await Promise.all([
    isFreeEmail ? Promise.resolve(null) : searchCompanyInfo(domain).catch(() => null),
    searchLinkedIn(name, isFreeEmail ? null : domain).catch(() => null),
  ]);

  if (companyInfo) {
    result.companyName = companyInfo.name;
    result.companyDescription = companyInfo.description;
  }

  if (linkedIn) {
    result.linkedinUrl = linkedIn.linkedinUrl;
  }

  return result;
}
