/**
 * Auto-Publish Agent
 * Automatically merges PRs based on review recommendation and age
 */

import fs from 'fs';

/**
 * Get GitHub API endpoints
 */
function getGitHubContext() {
  const owner = process.env.GITHUB_REPOSITORY?.split('/')[0];
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
  const token = process.env.GITHUB_TOKEN;

  return { owner, repo, token };
}

/**
 * Make GitHub API request
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {Object} body - Request body (for POST/PATCH)
 * @returns {Promise} Response data
 */
async function githubApiRequest(method, endpoint, body = null) {
  const timestamp = new Date().toISOString();
  const { token } = getGitHubContext();

  if (!token) {
    console.warn(`[${timestamp}] GITHUB_TOKEN not set, skipping API request`);
    return null;
  }

  const baseUrl = 'https://api.github.com';
  const url = `${baseUrl}${endpoint}`;

  try {
    const options = {
      method,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`GitHub API error ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[${timestamp}] GitHub API request failed:`, error.message);
    throw error;
  }
}

/**
 * List PRs with a specific label
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} label - Label name
 * @returns {Promise} Array of PRs
 */
async function listPRsByLabel(owner, repo, label) {
  const timestamp = new Date().toISOString();

  try {
    const endpoint = `/repos/${owner}/${repo}/issues?labels=${encodeURIComponent(label)}&state=open`;
    const response = await githubApiRequest('GET', endpoint);

    // Filter to only PRs (issues have pull_request field for PRs)
    const prs = response.filter((item) => item.pull_request);

    console.log(
      `[${timestamp}] Found ${prs.length} open PRs with label "${label}"`
    );

    return prs;
  } catch (error) {
    console.error(`[${timestamp}] Failed to list PRs by label:`, error.message);
    return [];
  }
}

/**
 * Get PR details
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @returns {Promise} PR details
 */
async function getPRDetails(owner, repo, prNumber) {
  const timestamp = new Date().toISOString();

  try {
    const endpoint = `/repos/${owner}/${repo}/pulls/${prNumber}`;
    const pr = await githubApiRequest('GET', endpoint);
    return pr;
  } catch (error) {
    console.error(
      `[${timestamp}] Failed to get PR #${prNumber} details:`,
      error.message
    );
    return null;
  }
}

/**
 * Get PR reviews
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @returns {Promise} Array of reviews
 */
async function getPRReviews(owner, repo, prNumber) {
  const timestamp = new Date().toISOString();

  try {
    const endpoint = `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;
    const reviews = await githubApiRequest('GET', endpoint);
    return reviews || [];
  } catch (error) {
    console.error(
      `[${timestamp}] Failed to get PR #${prNumber} reviews:`,
      error.message
    );
    return [];
  }
}

/**
 * Merge PR
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @param {string} mergeMethod - 'merge' | 'squash' | 'rebase' (default: 'squash')
 * @returns {Promise} Merge result
 */
async function mergePR(owner, repo, prNumber, mergeMethod = 'squash') {
  const timestamp = new Date().toISOString();

  try {
    const endpoint = `/repos/${owner}/${repo}/pulls/${prNumber}/merge`;
    const result = await githubApiRequest('PUT', endpoint, {
      merge_method: mergeMethod,
      commit_title: `Merge PR #${prNumber}: Content review approved`,
      commit_message: `Automated merge from content review agent.\n\nQuality checks passed. This PR has been auto-merged based on content review validation.`,
    });

    console.log(`[${timestamp}] Merged PR #${prNumber} with method "${mergeMethod}"`);
    return result;
  } catch (error) {
    console.error(`[${timestamp}] Failed to merge PR #${prNumber}:`, error.message);
    throw error;
  }
}

/**
 * Check if PR has any rejected reviews
 * @param {Array} reviews - Array of reviews
 * @returns {boolean}
 */
function hasRejectedReviews(reviews) {
  return reviews.some(
    (review) => review.state === 'CHANGES_REQUESTED' || review.state === 'DISMISSED'
  );
}

/**
 * Update "What's New" feed
 * @param {Object} prData - PR data to add to feed
 */
async function updateWhatsNewFeed(prData) {
  const timestamp = new Date().toISOString();

  try {
    const feedFile = './data/whats-new.json';

    let feed = {
      lastUpdated: timestamp,
      items: [],
    };

    // Read existing feed
    if (fs.existsSync(feedFile)) {
      feed = JSON.parse(fs.readFileSync(feedFile, 'utf-8'));
    }

    // Add new item
    const newItem = {
      id: `pr-${prData.number}`,
      title: prData.title,
      description: `New course content merged from PR #${prData.number}`,
      author: prData.user?.login || 'content-bot',
      url: prData.html_url,
      type: 'course-update',
      date: timestamp,
    };

    feed.items.unshift(newItem);

    // Keep only last 50 items
    feed.items = feed.items.slice(0, 50);
    feed.lastUpdated = timestamp;

    // Ensure data directory exists
    const dataDir = './data';
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(feedFile, JSON.stringify(feed, null, 2));

    console.log(`[${timestamp}] Updated "What's New" feed with PR #${prData.number}`);
  } catch (error) {
    console.error(`[${timestamp}] Failed to update "What's New" feed:`, error.message);
    // Don't throw - this is secondary to the main merge operation
  }
}

/**
 * Check if PR is old enough to auto-merge
 * @param {Object} pr - PR object
 * @param {number} ageHours - Minimum age in hours (default: 48)
 * @returns {boolean}
 */
function isOldEnough(pr, ageHours = 48) {
  const createdAt = new Date(pr.created_at);
  const now = new Date();
  const ageMs = now - createdAt;
  const ageHoursActual = ageMs / (1000 * 60 * 60);

  return ageHoursActual >= ageHours;
}

/**
 * Main auto-publish function
 */
export async function autoPublish() {
  const timestamp = new Date().toISOString();

  try {
    const { owner, repo } = getGitHubContext();

    if (!owner || !repo) {
      console.log(
        `[${timestamp}] Not in a repository context, skipping auto-publish`
      );
      return;
    }

    console.log(`[${timestamp}] Starting auto-publish for ${owner}/${repo}`);

    let mergedCount = 0;
    let skippedCount = 0;

    // Phase 1: Auto-merge all 'auto-merge' labeled PRs
    console.log(`[${timestamp}] Phase 1: Processing 'auto-merge' labeled PRs...`);

    const autoMergePRs = await listPRsByLabel(owner, repo, 'auto-merge');

    for (const prIssue of autoMergePRs) {
      const prNumber = prIssue.number;

      try {
        // Get PR details and reviews
        const pr = await getPRDetails(owner, repo, prNumber);
        const reviews = await getPRReviews(owner, repo, prNumber);

        if (!pr) {
          console.warn(
            `[${timestamp}] Could not retrieve PR #${prNumber}, skipping`
          );
          skippedCount++;
          continue;
        }

        // Check for rejected reviews
        if (hasRejectedReviews(reviews)) {
          console.log(
            `[${timestamp}] PR #${prNumber} has rejected reviews, skipping`
          );
          skippedCount++;
          continue;
        }

        // Check PR status (must be mergeable)
        if (pr.mergeable === false) {
          console.log(
            `[${timestamp}] PR #${prNumber} has merge conflicts, skipping`
          );
          skippedCount++;
          continue;
        }

        // Merge the PR
        await mergePR(owner, repo, prNumber, 'squash');
        await updateWhatsNewFeed(pr);
        mergedCount++;
      } catch (error) {
        console.error(
          `[${timestamp}] Failed to process auto-merge PR #${prNumber}:`,
          error.message
        );
        skippedCount++;
      }
    }

    // Phase 2: Auto-merge 'needs-review' PRs if they're old and have no objections
    console.log(
      `[${timestamp}] Phase 2: Processing 'needs-review' PRs older than 48 hours...`
    );

    const needsReviewPRs = await listPRsByLabel(owner, repo, 'needs-review');

    for (const prIssue of needsReviewPRs) {
      const prNumber = prIssue.number;

      try {
        // Get PR details and reviews
        const pr = await getPRDetails(owner, repo, prNumber);
        const reviews = await getPRReviews(owner, repo, prNumber);

        if (!pr) {
          console.warn(
            `[${timestamp}] Could not retrieve PR #${prNumber}, skipping`
          );
          skippedCount++;
          continue;
        }

        // Check age
        if (!isOldEnough(pr, 48)) {
          console.log(
            `[${timestamp}] PR #${prNumber} is less than 48 hours old, skipping`
          );
          skippedCount++;
          continue;
        }

        // Check for rejected reviews or objections
        if (hasRejectedReviews(reviews)) {
          console.log(
            `[${timestamp}] PR #${prNumber} has unresolved objections, skipping`
          );
          skippedCount++;
          continue;
        }

        // Check PR status
        if (pr.mergeable === false) {
          console.log(
            `[${timestamp}] PR #${prNumber} has merge conflicts, skipping`
          );
          skippedCount++;
          continue;
        }

        // Merge the PR
        await mergePR(owner, repo, prNumber, 'squash');
        await updateWhatsNewFeed(pr);
        mergedCount++;
      } catch (error) {
        console.error(
          `[${timestamp}] Failed to process needs-review PR #${prNumber}:`,
          error.message
        );
        skippedCount++;
      }
    }

    console.log(
      `[${timestamp}] Auto-publish complete: ${mergedCount} merged, ${skippedCount} skipped`
    );

    return {
      timestamp,
      mergedCount,
      skippedCount,
      totalProcessed: mergedCount + skippedCount,
    };
  } catch (error) {
    console.error(`[${timestamp}] Auto-publish failed:`, error.message);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  autoPublish()
    .then((result) => {
      console.log(
        `[${new Date().toISOString()}] Auto-publish completed successfully`
      );
      console.log(`Result:`, result);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`[${new Date().toISOString()}] Auto-publish failed:`, error);
      process.exit(1);
    });
}

export default autoPublish;
