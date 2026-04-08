#!/usr/bin/env node

/**
 * Auto-Discovery of New Sources
 * 
 * Analyzes crawled content to find links to potentially useful new sources.
 * New sources are added to sources.yaml with low confidence score.
 * Exports a function that can be called during the main discovery crawl.
 */

/**
 * Extract URLs from content
 */
function extractUrls(content) {
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]*[a-zA-Z0-9/]/g;
  const urls = content.match(urlPattern) || [];
  return [...new Set(urls)]; // Deduplicate
}

/**
 * Determine source type from URL pattern
 */
function determineSourceType(url) {
  const urlLower = url.toLowerCase();

  // GitHub releases
  if (urlLower.includes('github.com') && urlLower.includes('releases')) {
    return 'github_releases';
  }

  // GitHub raw content / docs
  if (urlLower.includes('github.com') || urlLower.includes('raw.githubusercontent.com')) {
    return 'github_releases';
  }

  // VS Code Marketplace
  if (urlLower.includes('marketplace.visualstudio.com')) {
    return 'marketplace';
  }

  // GitHub Pages
  if (urlLower.includes('github.io')) {
    return 'docs';
  }

  // RSS feed patterns
  if (urlLower.includes('feed') || urlLower.includes('rss') || urlLower.endsWith('.xml')) {
    return 'rss';
  }

  // Blog patterns
  if (urlLower.includes('blog') || urlLower.includes('articles') || urlLower.includes('posts')) {
    return 'blog';
  }

  // Official docs (common patterns)
  if (
    urlLower.includes('docs.github.com') ||
    urlLower.includes('github.com/docs') ||
    urlLower.includes('help.github.com') ||
    urlLower.includes('documentation') ||
    urlLower.includes('guide') ||
    urlLower.includes('tutorial')
  ) {
    return 'docs';
  }

  // Default to docs for general web pages
  return 'docs';
}

/**
 * Calculate confidence score for a URL
 */
function calculateConfidenceScore(url, existingSources) {
  let score = 0.3; // Base score for new source

  const urlLower = url.toLowerCase();

  // Official GitHub sources - high confidence
  if (urlLower.includes('github.com') || urlLower.includes('github.io')) {
    score += 0.3;
  }

  // VS Code Marketplace - high confidence
  if (urlLower.includes('marketplace.visualstudio.com')) {
    score += 0.2;
  }

  // Well-known blog platforms
  if (
    urlLower.includes('medium.com') ||
    urlLower.includes('dev.to') ||
    urlLower.includes('hashnode.com')
  ) {
    score += 0.15;
  }

  // Has proper domain/path structure
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname && urlObj.pathname.length > 1) {
      score += 0.1;
    }
  } catch {
    score -= 0.2; // Invalid URL
  }

  // Cap at 1.0
  return Math.min(score, 1.0);
}

/**
 * Generate source ID from URL
 */
function generateSourceId(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const path = urlObj.pathname.replace(/[^a-z0-9]/gi, '-').substring(0, 20);
    const id = `${domain}-${path}`.toLowerCase().replace(/^-+|-+$/g, '');
    return id.substring(0, 50);
  } catch {
    return `source-${Date.now()}`;
  }
}

/**
 * Check if URL is relevant to GitHub Copilot
 */
function isRelevantToCopilot(url) {
  const urlLower = url.toLowerCase();
  const relevantPatterns = [
    'copilot',
    'github',
    'vscode',
    'code-completion',
    'ai-pair-programmer',
    'code-generation',
  ];

  return relevantPatterns.some(pattern => urlLower.includes(pattern));
}

/**
 * Check if URL should be ignored
 */
function shouldIgnoreUrl(url, existingSources) {
  const urlLower = url.toLowerCase();

  // Ignore social media profiles (except GitHub)
  if (
    urlLower.includes('twitter.com') ||
    urlLower.includes('linkedin.com') ||
    urlLower.includes('facebook.com') ||
    urlLower.includes('instagram.com')
  ) {
    return true;
  }

  // Ignore very short URLs (likely navigation links)
  if (url.length < 20) {
    return true;
  }

  // Ignore already known sources
  const sourceUrls = Object.values(existingSources).map(s => s.url);
  if (sourceUrls.includes(url)) {
    return true;
  }

  // Ignore similar URLs (same domain)
  try {
    const newUrlObj = new URL(url);
    for (const sourceUrl of sourceUrls) {
      try {
        const existingUrlObj = new URL(sourceUrl);
        if (newUrlObj.hostname === existingUrlObj.hostname) {
          return true; // Same domain already exists
        }
      } catch {
        continue;
      }
    }
  } catch {
    return true;
  }

  return false;
}

/**
 * Discover new sources from crawled content
 * 
 * @param {string} crawledContent - Combined text content from all crawled sources
 * @param {object} existingSources - Existing sources object from sources.yaml
 * @returns {array} Array of new source objects to add to sources.yaml
 */
export function discoverNewSources(crawledContent, existingSources = {}) {
  const urls = extractUrls(crawledContent);
  const newSources = [];

  for (const url of urls) {
    // Skip if should be ignored
    if (shouldIgnoreUrl(url, existingSources)) {
      continue;
    }

    // Check relevance to Copilot (optional - comment out if you want all tech sources)
    if (!isRelevantToCopilot(url)) {
      continue;
    }

    // Generate source configuration
    const sourceId = generateSourceId(url);
    const sourceType = determineSourceType(url);
    const confidenceScore = calculateConfidenceScore(url, existingSources);

    newSources.push({
      id: sourceId,
      url,
      type: sourceType,
      status: 'unverified',
      confidenceScore,
      discoveredAt: new Date().toISOString(),
      description: `Auto-discovered ${sourceType} source`
    });
  }

  return newSources;
}

/**
 * CLI mode - can run standalone
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  // Example usage
  const exampleContent = `
    Check out https://github.com/github/copilot-docs for more info.
    Visit https://docs.github.com/en/copilot for the official docs.
    Read about it on https://github.blog/category/copilot/
    Subscribe to https://github.com/github/copilot-releases/releases.atom for updates.
    See the marketplace at https://marketplace.visualstudio.com/items?itemName=GitHub.copilot
  `;

  const exampleSources = {
    'github-docs': {
      url: 'https://docs.github.com/en/copilot',
      type: 'docs',
      status: 'active'
    }
  };

  const discovered = discoverNewSources(exampleContent, exampleSources);

  console.log('Discovered new sources:');
  console.log(JSON.stringify(discovered, null, 2));
}
