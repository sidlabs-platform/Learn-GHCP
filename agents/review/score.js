/**
 * Quality Score Calculator
 * Computes composite quality score and merge recommendation
 */

/**
 * Calculate readability score based on content structure
 * @param {string} content - The markdown content
 * @returns {number} Readability score (0-100)
 */
export function calculateReadabilityScore(content) {
  let score = 100;

  // Check for headings
  const headingCount = (content.match(/^#+\s/gm) || []).length;
  if (headingCount < 3) {
    score -= 15; // No clear structure
  }

  // Check for code blocks (good for readability when balanced)
  const codeBlockCount = (content.match(/```/g) || []).length / 2;
  if (codeBlockCount === 0) {
    score -= 10; // No code examples
  }

  // Check for lists
  const listItemCount = (content.match(/^[-*]\s/gm) || []).length;
  if (listItemCount === 0 && codeBlockCount === 0) {
    score -= 10; // Wall of text
  }

  // Check for line length (very long lines reduce readability)
  const lines = content.split('\n');
  const longLines = lines.filter((line) => line.length > 100).length;
  const longLineRatio = longLines / Math.max(lines.length, 1);
  if (longLineRatio > 0.5) {
    score -= 15; // Too many long lines
  }

  // Check for excessive code block length
  const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const blockLines = match[1].split('\n').length;
    if (blockLines > 500) {
      score -= 20; // Code block is too long to read easily
      break;
    }
  }

  return Math.max(0, score);
}

/**
 * Validate links in content
 * @param {string} content - The markdown content
 * @returns {Object} {score, issues, linkCount}
 */
export function validateLinkIntegrity(content) {
  let score = 100;
  const issues = [];

  // Extract all links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    links.push({
      text: match[1],
      url: match[2],
    });
  }

  // Check for broken link patterns
  links.forEach((link) => {
    // Check for empty or placeholder URLs
    if (!link.url || link.url === '#' || link.url === '') {
      issues.push(`❌ Empty or placeholder link: [${link.text}](${link.url})`);
      score -= 10;
    }

    // Check for malformed URLs
    if (!link.url.startsWith('#') && !link.url.startsWith('http') && !link.url.startsWith('/')) {
      // Relative links should be reasonable
      if (link.url.includes('..') && link.url.match(/\.\.\//g).length > 3) {
        issues.push(`⚠️ Complex relative path: [${link.text}](${link.url})`);
        score -= 5;
      }
    }

    // Check for typos in common domains
    if (link.url.includes('http') && !link.url.startsWith('https')) {
      issues.push(
        `⚠️ Link uses HTTP instead of HTTPS: [${link.text}](${link.url})`
      );
      score -= 5;
    }
  });

  return {
    score: Math.max(0, score),
    issues,
    linkCount: links.length,
  };
}

/**
 * Calculate content completeness score
 * @param {string} content - The markdown content
 * @returns {number} Completeness score (0-100)
 */
export function calculateCompletenessScore(content) {
  let score = 100;
  const minLength = 500; // Minimum words for meaningful content
  const optimalLength = 2000;

  // Count words
  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;

  if (wordCount < minLength) {
    score -= 30; // Too brief
  } else if (wordCount > optimalLength * 2) {
    score -= 10; // Could be too long, but not as bad as too short
  }

  // Check for summary/conclusion
  if (!content.toLowerCase().includes('summary') && !content.toLowerCase().includes('conclusion')) {
    score -= 10; // No wrap-up
  }

  // Check for at least one code example
  if (!/```/g.test(content)) {
    score -= 15; // No code examples
  }

  return Math.max(0, score);
}

/**
 * Calculate composite quality score
 * @param {Object} subScores - Object with score components
 *   - codeCorrectness (number 0-100)
 *   - difficultyCompliance (number 0-100)
 *   - readability (number 0-100)
 *   - linkIntegrity (number 0-100)
 *   - completeness (number 0-100)
 * @returns {Object} {score, recommendation, breakdown}
 */
export function calculateQualityScore(subScores) {
  const timestamp = new Date().toISOString();

  // Validate input
  const required = [
    'codeCorrectness',
    'difficultyCompliance',
    'readability',
    'linkIntegrity',
    'completeness',
  ];
  for (const key of required) {
    if (!(key in subScores)) {
      console.error(
        `[${timestamp}] Missing required score: ${key}`
      );
      return {
        score: 0,
        recommendation: 'needs-human-review',
        breakdown: subScores,
        error: `Missing required score: ${key}`,
      };
    }
  }

  // Weight the scores
  const weights = {
    codeCorrectness: 0.25,
    difficultyCompliance: 0.25,
    readability: 0.2,
    linkIntegrity: 0.15,
    completeness: 0.15,
  };

  let totalScore = 0;
  for (const [key, weight] of Object.entries(weights)) {
    totalScore += (subScores[key] || 0) * weight;
  }

  const finalScore = Math.round(totalScore * 100) / 100;

  // Determine recommendation
  let recommendation = 'needs-human-review';
  if (finalScore >= 85) {
    recommendation = 'auto-merge';
  } else if (finalScore >= 60) {
    recommendation = 'needs-review';
  }

  console.log(
    `[${timestamp}] Quality score calculated: ${finalScore} (${recommendation})`
  );

  return {
    score: finalScore,
    recommendation,
    breakdown: {
      codeCorrectness: subScores.codeCorrectness,
      difficultyCompliance: subScores.difficultyCompliance,
      readability: subScores.readability,
      linkIntegrity: subScores.linkIntegrity,
      completeness: subScores.completeness,
    },
    weights,
    timestamp,
  };
}

/**
 * Determine if a score threshold is met
 * @param {number} score - The quality score
 * @param {string} level - 'auto-merge' | 'needs-review' | 'needs-human-review'
 * @returns {boolean}
 */
export function meetsThreshold(score, level = 'needs-review') {
  const thresholds = {
    'auto-merge': 85,
    'needs-review': 60,
    'needs-human-review': 0,
  };

  return score >= (thresholds[level] || 0);
}
