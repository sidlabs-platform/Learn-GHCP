/**
 * PR Label Applier
 * Applies GitHub PR labels and comments based on review results
 */

import fs from 'fs';
import path from 'path';

/**
 * Get GitHub API endpoints
 */
function getGitHubContext() {
  const owner = process.env.GITHUB_REPOSITORY?.split('/')[0];
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
  const prNumber = process.env.GITHUB_REF?.match(/refs\/pull\/(\d+)/)?.[1];
  const token = process.env.GITHUB_TOKEN;

  return { owner, repo, prNumber, token };
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
 * Apply labels to PR
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @param {Array} labels - Array of label names
 */
async function applyLabels(owner, repo, prNumber, labels) {
  const timestamp = new Date().toISOString();

  if (!owner || !repo || !prNumber) {
    console.warn(
      `[${timestamp}] Missing GitHub context, skipping label application`
    );
    return;
  }

  try {
    const endpoint = `/repos/${owner}/${repo}/issues/${prNumber}/labels`;
    await githubApiRequest('POST', endpoint, { labels });
    console.log(`[${timestamp}] Applied labels to PR #${prNumber}: ${labels.join(', ')}`);
  } catch (error) {
    console.error(`[${timestamp}] Failed to apply labels:`, error.message);
    throw error;
  }
}

/**
 * Add comment to PR
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @param {string} comment - Comment text
 */
async function addPullRequestComment(owner, repo, prNumber, comment) {
  const timestamp = new Date().toISOString();

  if (!owner || !repo || !prNumber) {
    console.warn(
      `[${timestamp}] Missing GitHub context, skipping PR comment`
    );
    return;
  }

  try {
    const endpoint = `/repos/${owner}/${repo}/issues/${prNumber}/comments`;
    await githubApiRequest('POST', endpoint, { body: comment });
    console.log(`[${timestamp}] Added comment to PR #${prNumber}`);
  } catch (error) {
    console.error(`[${timestamp}] Failed to add PR comment:`, error.message);
    throw error;
  }
}

/**
 * Create GitHub Issue
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} title - Issue title
 * @param {string} body - Issue body
 * @param {Array} labels - Issue labels
 */
async function createGitHubIssue(owner, repo, title, body, labels = []) {
  const timestamp = new Date().toISOString();

  if (!owner || !repo) {
    console.warn(
      `[${timestamp}] Missing GitHub context, skipping issue creation`
    );
    return null;
  }

  try {
    const endpoint = `/repos/${owner}/${repo}/issues`;
    const response = await githubApiRequest('POST', endpoint, {
      title,
      body,
      labels,
    });
    console.log(`[${timestamp}] Created GitHub Issue #${response.number}`);
    return response;
  } catch (error) {
    console.error(`[${timestamp}] Failed to create issue:`, error.message);
    throw error;
  }
}

/**
 * Format review results as PR comment
 * @param {Array} results - Array of review results
 * @returns {string} Formatted comment
 */
function formatReviewComment(results) {
  let comment = '## 📋 Content Review Results\n\n';

  if (results.length === 0) {
    comment += 'No course files were reviewed.\n';
    return comment;
  }

  // Summary stats
  const summary = {
    total: results.length,
    autoMerge: results.filter((r) => r.recommendation === 'auto-merge').length,
    needsReview: results.filter((r) => r.recommendation === 'needs-review')
      .length,
    needsHumanReview: results.filter(
      (r) => r.recommendation === 'needs-human-review'
    ).length,
  };

  comment += `| Status | Count |\n`;
  comment += `|--------|-------|\n`;
  comment += `| ✅ Auto-merge | ${summary.autoMerge} |\n`;
  comment += `| 👀 Needs review | ${summary.needsReview} |\n`;
  comment += `| 🔴 Needs human review | ${summary.needsHumanReview} |\n\n`;

  // Detailed results
  comment += '### Detailed Results\n\n';

  results.forEach((result) => {
    if (result.error) {
      comment += `#### ❌ ${result.courseFile}\n`;
      comment += `Error: ${result.error}\n\n`;
      return;
    }

    const emoji =
      result.recommendation === 'auto-merge'
        ? '✅'
        : result.recommendation === 'needs-review'
          ? '👀'
          : '🔴';

    comment += `#### ${emoji} ${result.title}\n`;
    comment += `- **Quality Score**: ${result.qualityScore}/100\n`;
    comment += `- **Difficulty**: ${result.difficulty}\n`;
    comment += `- **Recommendation**: ${result.recommendation}\n`;
    comment += `- **Scores**: Code ${result.subScores.codeCorrectness}, Difficulty ${result.subScores.difficultyCompliance}, Readability ${result.subScores.readability}\n`;

    if (result.issues && result.issues.length > 0) {
      comment += `- **Issues**:\n`;
      result.issues.slice(0, 3).forEach((issue) => {
        comment += `  - ${issue}\n`;
      });
      if (result.issues.length > 3) {
        comment += `  - ... and ${result.issues.length - 3} more\n`;
      }
    }

    comment += '\n';
  });

  return comment;
}

/**
 * Format review results as GitHub Issue
 * @param {Array} results - Array of review results with issues
 * @returns {string} Formatted issue body
 */
function formatReviewIssue(results) {
  let body = '## 🔍 Content Review Issues\n\n';
  body +=
    'The following courses need human review due to quality or compliance issues.\n\n';

  const needsHumanReview = results.filter(
    (r) => r.recommendation === 'needs-human-review'
  );

  needsHumanReview.forEach((result) => {
    if (result.error) {
      body += `### ⚠️ ${result.courseFile}\n`;
      body += `Error: ${result.error}\n\n`;
      return;
    }

    body += `### ${result.title}\n`;
    body += `- **File**: \`${result.courseFile}\`\n`;
    body += `- **Quality Score**: ${result.qualityScore}/100\n`;
    body += `- **Difficulty**: ${result.difficulty}\n`;
    body += `- **Score Breakdown**:\n`;
    body += `  - Code Correctness: ${result.subScores.codeCorrectness}%\n`;
    body += `  - Difficulty Compliance: ${result.subScores.difficultyCompliance}%\n`;
    body += `  - Readability: ${result.subScores.readability}%\n`;
    body += `  - Link Integrity: ${result.subScores.linkIntegrity}%\n`;
    body += `  - Completeness: ${result.subScores.completeness}%\n`;

    if (result.issues && result.issues.length > 0) {
      body += `- **Issues Found**:\n`;
      result.issues.forEach((issue) => {
        body += `  - ${issue}\n`;
      });
    }

    body += '\n---\n\n';
  });

  body += '### Next Steps\n';
  body += '1. Review the issues listed above\n';
  body += '2. Update the course content to address failures\n';
  body += '3. Re-run the review when ready\n';

  return body;
}

/**
 * Main function to apply labels and create comments
 */
export async function applyReviewLabels() {
  const timestamp = new Date().toISOString();

  try {
    // Read review results
    const resultsFile = './data/review-results.json';
    if (!fs.existsSync(resultsFile)) {
      console.log(`[${timestamp}] Review results file not found: ${resultsFile}`);
      return;
    }

    const reviewData = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
    const { results } = reviewData;

    console.log(
      `[${timestamp}] Processing ${results.length} review results`
    );

    // Get GitHub context
    const { owner, repo, prNumber } = getGitHubContext();

    if (!owner || !repo || !prNumber) {
      console.log(
        `[${timestamp}] Not in a PR context, skipping label application`
      );
      console.log('Available for use in GitHub Actions PR workflows only');
      return;
    }

    // Determine recommendation
    const recommendations = results
      .filter((r) => r.recommendation)
      .map((r) => r.recommendation);

    const labelsToApply = [];
    if (recommendations.includes('needs-human-review')) {
      labelsToApply.push('needs-human-review');
    } else if (recommendations.includes('needs-review')) {
      labelsToApply.push('needs-review');
    } else if (recommendations.some((r) => r === 'auto-merge')) {
      labelsToApply.push('auto-merge');
    }

    // Add quality score label
    const avgScore = results.reduce(
      (sum, r) => sum + (r.qualityScore || 0),
      0
    ) / Math.max(results.length, 1);
    if (avgScore >= 85) {
      labelsToApply.push('quality-excellent');
    } else if (avgScore >= 70) {
      labelsToApply.push('quality-good');
    } else {
      labelsToApply.push('quality-needs-work');
    }

    // Apply labels
    if (labelsToApply.length > 0) {
      await applyLabels(owner, repo, prNumber, labelsToApply);
    }

    // Add PR comment with results
    const comment = formatReviewComment(results);
    await addPullRequestComment(owner, repo, prNumber, comment);

    // Create issue for needs-human-review items
    const needsHumanReview = results.filter(
      (r) => r.recommendation === 'needs-human-review'
    );
    if (needsHumanReview.length > 0) {
      const issueBody = formatReviewIssue(results);
      const issue = await createGitHubIssue(
        owner,
        repo,
        `[Review Required] Course content needs human review from PR #${prNumber}`,
        issueBody,
        ['review-required', 'content-quality']
      );

      if (issue) {
        // Add issue link to PR comment
        const issueComment = `\n> Related issue: #${issue.number}\n`;
        await addPullRequestComment(owner, repo, prNumber, issueComment);
      }
    }

    console.log(`[${timestamp}] Label application complete`);
  } catch (error) {
    console.error(`[${timestamp}] Label application failed:`, error.message);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  applyReviewLabels()
    .then(() => {
      console.log(
        `[${new Date().toISOString()}] Label applier completed successfully`
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error(
        `[${new Date().toISOString()}] Label applier failed:`,
        error
      );
      process.exit(1);
    });
}

export default applyReviewLabels;
