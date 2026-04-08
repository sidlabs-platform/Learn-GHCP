#!/usr/bin/env node

/**
 * Feature Discovery Agent
 * 
 * Main discovery agent that crawls configured sources and updates the feature catalog.
 * - Reads sources.yaml for active sources
 * - Fetches/crawls based on source type (docs, blog, rss, github_releases, marketplace)
 * - Compares findings against features.yaml
 * - Adds new features and updates existing ones
 * - Marks potentially deprecated features
 * - Includes retry logic with exponential backoff
 * - Logs progress with timestamps
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import https from 'https';
import { discoverNewSources } from './source-discovery.js';

// Configuration
const DATA_DIR = path.join(process.cwd(), 'data');
const SOURCES_FILE = path.join(DATA_DIR, 'sources.yaml');
const FEATURES_FILE = path.join(DATA_DIR, 'features.yaml');
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Log with timestamp
 */
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

/**
 * Retry logic with exponential backoff
 */
async function retryAsync(fn, maxRetries = MAX_RETRIES) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        log(`Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Fetch URL content with retry logic
 */
async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Extract Copilot feature mentions from text content
 */
function extractFeatures(content) {
  const features = [];
  const patterns = [
    /(?:copilot|co-pilot)\s+(?:feature|capability|tool|extension|skill).*?:\s*([^\n.!?]+)/gi,
    /(?:new|introducing|available)\s+(?:in|with)?\s*(?:copilot|co-pilot)[:\s]+([^\n.!?]+)/gi,
    /(?:github\s+)?(?:copilot|co-pilot)\s+(?:now\s+)?supports?\s+([^\n.!?]+)/gi,
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const text = match[1].trim();
      if (text.length > 5 && text.length < 200) {
        features.push(text);
      }
    }
  });

  return [...new Set(features)]; // Deduplicate
}

/**
 * Crawl docs type source
 */
async function crawlDocs(source) {
  log(`Crawling docs source: ${source.url}`);
  const content = await fetchUrl(source.url);
  const features = extractFeatures(content);
  return {
    features,
    rawContent: content,
    sourceType: 'docs'
  };
}

/**
 * Crawl blog/RSS source (simplified - assumes HTML)
 */
async function crawlBlog(source) {
  log(`Crawling blog source: ${source.url}`);
  const content = await fetchUrl(source.url);
  
  // Extract post titles and summaries
  const postPattern = /<(?:article|h[1-3]|div class="post.*?".*?)>([^<]+)</gi;
  const features = extractFeatures(content);
  
  return {
    features,
    rawContent: content,
    sourceType: 'blog'
  };
}

/**
 * Crawl RSS feed (simplified)
 */
async function crawlRss(source) {
  log(`Crawling RSS source: ${source.url}`);
  const content = await fetchUrl(source.url);
  
  // Extract description and title fields
  const features = extractFeatures(content);
  
  return {
    features,
    rawContent: content,
    sourceType: 'rss'
  };
}

/**
 * Check GitHub releases via GitHub API
 */
async function crawlGithubReleases(source) {
  log(`Crawling GitHub releases: ${source.url}`);
  
  // Parse owner/repo from URL
  const match = source.url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub repository URL');
  }
  
  const [, owner, repo] = match;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
  
  const content = await fetchUrl(apiUrl);
  const features = extractFeatures(content);
  
  return {
    features,
    rawContent: content,
    sourceType: 'github_releases'
  };
}

/**
 * Check marketplace (simplified - assumes marketplace page returns HTML)
 */
async function crawlMarketplace(source) {
  log(`Crawling marketplace: ${source.url}`);
  const content = await fetchUrl(source.url);
  const features = extractFeatures(content);
  
  return {
    features,
    rawContent: content,
    sourceType: 'marketplace'
  };
}

/**
 * Route to appropriate crawler based on source type
 */
async function crawlSource(source) {
  switch (source.type) {
    case 'docs':
      return await crawlDocs(source);
    case 'blog':
      return await crawlBlog(source);
    case 'rss':
      return await crawlRss(source);
    case 'github_releases':
      return await crawlGithubReleases(source);
    case 'marketplace':
      return await crawlMarketplace(source);
    default:
      throw new Error(`Unknown source type: ${source.type}`);
  }
}

/**
 * Load YAML file
 */
function loadYaml(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content) || {};
  } catch (error) {
    log(`Warning: Could not load ${filePath}: ${error.message}`);
    return {};
  }
}

/**
 * Save YAML file
 */
function saveYaml(filePath, data) {
  const yamlStr = yaml.dump(data, { lineWidth: 100, forceQuotes: false });
  fs.writeFileSync(filePath, yamlStr, 'utf8');
  log(`Saved: ${filePath}`);
}

/**
 * Normalize feature text for comparison
 */
function normalizeFeature(text) {
  return text.toLowerCase().trim().replace(/[^\w\s]/g, '').substring(0, 100);
}

/**
 * Check if feature already exists in catalog
 */
function findExistingFeature(featureText, existingFeatures) {
  const normalized = normalizeFeature(featureText);
  for (const [id, feature] of Object.entries(existingFeatures)) {
    if (normalizeFeature(feature.name) === normalized) {
      return { id, feature };
    }
  }
  return null;
}

/**
 * Generate feature ID from text
 */
function generateFeatureId(text) {
  return text
    .toLowerCase()
    .trim()
    .substring(0, 50)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Main discovery pipeline
 */
async function runDiscovery() {
  log('=== Feature Discovery Agent Started ===');

  try {
    // Load existing data
    const sources = loadYaml(SOURCES_FILE);
    const features = loadYaml(FEATURES_FILE);
    const activeFeatures = new Set();

    // Filter to active sources
    const sourcesToCrawl = Object.entries(sources)
      .filter(([, source]) => source.status === 'active')
      .map(([id, source]) => ({ id, ...source }));

    log(`Found ${sourcesToCrawl.length} active sources to crawl`);

    // Crawl each source
    const crawlResults = [];
    for (const source of sourcesToCrawl) {
      try {
        const result = await retryAsync(() => crawlSource(source));
        crawlResults.push({
          sourceId: source.id,
          ...result
        });

        // Update source last crawled timestamp
        sources[source.id].lastCrawled = new Date().toISOString();
        log(`✓ Successfully crawled ${source.id} (${result.features.length} features found)`);

      } catch (error) {
        log(`✗ Failed to crawl ${source.id}: ${error.message}`);
        sources[source.id].lastError = error.message;
        sources[source.id].lastErrorTime = new Date().toISOString();
      }
    }

    // Process crawl results and update features
    for (const crawlResult of crawlResults) {
      for (const featureText of crawlResult.features) {
        const existing = findExistingFeature(featureText, features);

        if (existing) {
          // Update existing feature
          existing.feature.lastSeen = new Date().toISOString();
          existing.feature.sources = [...new Set([...(existing.feature.sources || []), crawlResult.sourceId])];
          activeFeatures.add(existing.id);
          log(`  Updated: ${existing.id}`);

        } else {
          // Add new feature
          const featureId = generateFeatureId(featureText);
          const uniqueId = featureId;

          features[uniqueId] = {
            id: uniqueId,
            name: featureText,
            status: 'new',
            sources: [crawlResult.sourceId],
            discovered: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            description: '',
            difficulty: ['beginner'],
            tags: []
          };
          activeFeatures.add(uniqueId);
          log(`  NEW: ${uniqueId} - ${featureText}`);
        }
      }
    }

    // Mark features not found in any source as potentially deprecated
    let deprecatedCount = 0;
    for (const [id, feature] of Object.entries(features)) {
      if (feature.status !== 'deprecated' && !activeFeatures.has(id)) {
        const daysSinceSeen = (new Date() - new Date(feature.lastSeen)) / (1000 * 60 * 60 * 24);
        if (daysSinceSeen > 30) {
          feature.status = 'deprecated';
          log(`  Marked as deprecated: ${id} (not seen for ${Math.floor(daysSinceSeen)} days)`);
          deprecatedCount++;
        }
      }
    }

    // Discover new sources from crawled content
    log('Discovering new sources...');
    const allCrawledContent = crawlResults.map(r => r.rawContent).join('\n');
    const newSources = discoverNewSources(allCrawledContent, sources);
    
    if (newSources.length > 0) {
      for (const newSource of newSources) {
        sources[newSource.id] = newSource;
        log(`  NEW SOURCE: ${newSource.id} - ${newSource.url} (confidence: ${newSource.confidenceScore})`);
      }
    }

    // Save updated files
    saveYaml(SOURCES_FILE, sources);
    saveYaml(FEATURES_FILE, features);

    // Summary
    log('');
    log('=== Discovery Complete ===');
    log(`Features: ${Object.keys(features).length} total`);
    log(`New: ${Object.values(features).filter(f => f.status === 'new').length}`);
    log(`Deprecated: ${deprecatedCount}`);
    log(`New sources discovered: ${newSources.length}`);
    log('');

  } catch (error) {
    log(`FATAL ERROR: ${error.message}`);
    process.exit(1);
  }
}

// Run discovery
runDiscovery().catch(error => {
  log(`FATAL ERROR: ${error.message}`);
  process.exit(1);
});
