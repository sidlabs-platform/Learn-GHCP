/**
 * Main Review Agent
 * Finds and reviews course content for quality, correctness, and difficulty compliance
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { validateCodeBlocks } from './validate-code.js';
import { validateDifficulty } from './validate-difficulty.js';
import {
  calculateQualityScore,
  calculateReadabilityScore,
  validateLinkIntegrity,
  calculateCompletenessScore,
} from './score.js';

/**
 * Find course files to review
 * @returns {Array} Array of file paths
 */
function findCourseFiles() {
  const timestamp = new Date().toISOString();
  const coursesDir = path.resolve('./src/content/courses');

  if (!fs.existsSync(coursesDir)) {
    console.log(`[${timestamp}] Courses directory not found: ${coursesDir}`);
    return [];
  }

  const files = [];

  // Recursively find all markdown files
  function scanDirectory(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      entries.forEach((entry) => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
          // Check if it's a course file (has frontmatter)
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.startsWith('---')) {
              files.push(fullPath);
            }
          } catch (err) {
            console.warn(`[${timestamp}] Could not read file: ${fullPath}`);
          }
        }
      });
    } catch (err) {
      console.error(`[${timestamp}] Error scanning directory ${dir}:`, err.message);
    }
  }

  scanDirectory(coursesDir);

  console.log(`[${timestamp}] Found ${files.length} course files to review`);
  return files;
}

/**
 * Get recently changed files from git
 * @returns {Array} Array of file paths
 */
function getChangedFiles() {
  const timestamp = new Date().toISOString();

  try {
    // Get files changed in the last commit
    const changedFiles = execSync('git diff --name-only HEAD~1 HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })
      .trim()
      .split('\n')
      .filter((f) => (f.endsWith('.md') || f.endsWith('.mdx')) && f.includes('courses'));

    if (changedFiles.length > 0) {
      console.log(`[${timestamp}] Found ${changedFiles.length} changed files in git`);
      return changedFiles;
    }
  } catch (err) {
    console.log(`[${timestamp}] Could not get changed files from git, scanning all courses`);
  }

  // Fall back to all courses
  return findCourseFiles();
}

/**
 * Parse frontmatter from markdown
 * @param {string} content - The markdown content
 * @returns {Object} {frontmatter, body}
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = match[1];
  const body = match[2];
  const frontmatter = {};

  frontmatterText.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      frontmatter[key.trim()] = valueParts
        .join(':')
        .trim()
        .replace(/^["']|["']$/g, '');
    }
  });

  return { frontmatter, body };
}

/**
 * Review a single course file
 * @param {string} filePath - Path to the course file
 * @returns {Object} Review result
 */
function reviewCourseFile(filePath) {
  const timestamp = new Date().toISOString();

  try {
    // Read file
    if (!fs.existsSync(filePath)) {
      console.warn(`[${timestamp}] File not found: ${filePath}`);
      return {
        courseFile: filePath,
        error: 'File not found',
        timestamp,
      };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    // Run validators
    const codeValidation = validateCodeBlocks(body);
    const difficultyValidation = validateDifficulty(content);
    const readabilityScore = calculateReadabilityScore(body);
    const linkValidation = validateLinkIntegrity(body);
    const completenessScore = calculateCompletenessScore(body);

    // Calculate composite score
    const qualityResult = calculateQualityScore({
      codeCorrectness: codeValidation.score,
      difficultyCompliance: difficultyValidation.score,
      readability: readabilityScore,
      linkIntegrity: linkValidation.score,
      completeness: completenessScore,
    });

    // Collect all issues
    const allIssues = [];

    if (codeValidation.issues && codeValidation.issues.length > 0) {
      allIssues.push(
        ...codeValidation.issues.map(
          (issue) => `Code: ${JSON.stringify(issue)}`
        )
      );
    }

    if (difficultyValidation.issues && difficultyValidation.issues.length > 0) {
      allIssues.push(
        ...difficultyValidation.issues.map((issue) => `Difficulty: ${issue}`)
      );
    }

    if (linkValidation.issues && linkValidation.issues.length > 0) {
      allIssues.push(
        ...linkValidation.issues.map((issue) => `Links: ${issue}`)
      );
    }

    const result = {
      courseFile: filePath.replace(/\\/g, '/'), // Normalize to forward slashes
      title: frontmatter.title || path.basename(filePath),
      difficulty: difficultyValidation.level || frontmatter.difficulty || 'unknown',
      qualityScore: qualityResult.score,
      recommendation: qualityResult.recommendation,
      subScores: {
        codeCorrectness: codeValidation.score,
        difficultyCompliance: difficultyValidation.score,
        readability: readabilityScore,
        linkIntegrity: linkValidation.score,
        completeness: completenessScore,
      },
      issues: allIssues,
      metadata: {
        codeBlockCount: codeValidation.codeBlockCount || 0,
        linkCount: linkValidation.linkCount || 0,
        wordCount: body.split(/\s+/).length,
        maxCodeBlockLines: codeValidation.maxCodeBlockLines || 0,
      },
      timestamp,
    };

    console.log(
      `[${timestamp}] Reviewed: ${path.basename(filePath)} (score: ${result.qualityScore}, ${result.recommendation})`
    );

    return result;
  } catch (error) {
    console.error(`[${timestamp}] Error reviewing ${filePath}:`, error.message);
    return {
      courseFile: filePath.replace(/\\/g, '/'),
      error: error.message,
      timestamp,
    };
  }
}

/**
 * Main review function
 */
export async function runReview() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Starting content review...`);

  try {
    // Get files to review
    const filesToReview = getChangedFiles();

    if (filesToReview.length === 0) {
      console.log(`[${timestamp}] No course files found to review`);
      const output = {
        reviewedAt: timestamp,
        totalFiles: 0,
        results: [],
        summary: {
          autoMerge: 0,
          needsReview: 0,
          needsHumanReview: 0,
        },
      };

      // Ensure data directory exists
      const dataDir = './data';
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      fs.writeFileSync(
        './data/review-results.json',
        JSON.stringify(output, null, 2)
      );

      console.log(`[${timestamp}] Review complete: no files reviewed`);
      return output;
    }

    // Review each file
    const results = filesToReview.map((file) => reviewCourseFile(file));

    // Calculate summary
    const summary = {
      autoMerge: results.filter((r) => r.recommendation === 'auto-merge').length,
      needsReview: results.filter((r) => r.recommendation === 'needs-review').length,
      needsHumanReview: results.filter(
        (r) => r.recommendation === 'needs-human-review'
      ).length,
    };

    const output = {
      reviewedAt: timestamp,
      totalFiles: results.length,
      results,
      summary,
    };

    // Ensure data directory exists
    const dataDir = './data';
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write results to file
    fs.writeFileSync(
      './data/review-results.json',
      JSON.stringify(output, null, 2)
    );

    console.log(`[${timestamp}] Review complete: ${results.length} files reviewed`);
    console.log(`[${timestamp}] Summary - Auto-merge: ${summary.autoMerge}, Needs review: ${summary.needsReview}, Needs human review: ${summary.needsHumanReview}`);

    return output;
  } catch (error) {
    console.error(`[${timestamp}] Review failed:`, error.message);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runReview()
    .then(() => {
      console.log(
        `[${new Date().toISOString()}] Review agent completed successfully`
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error(
        `[${new Date().toISOString()}] Review agent failed:`,
        error
      );
      process.exit(1);
    });
}

export default runReview;
