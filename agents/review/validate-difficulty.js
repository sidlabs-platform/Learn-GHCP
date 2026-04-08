/**
 * Difficulty Compliance Validator
 * Validates course content against specified difficulty level requirements
 */

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

  // Simple YAML-like parsing for key: value pairs
  frontmatterText.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      frontmatter[key.trim()] = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
    }
  });

  return { frontmatter, body };
}

/**
 * Check if content has section
 * @param {string} content - The content to search
 * @param {Array|string} keywords - Keywords to search for
 * @returns {boolean}
 */
function hasSection(content, keywords) {
  const keywordArray = Array.isArray(keywords) ? keywords : [keywords];
  const contentLower = content.toLowerCase();
  return keywordArray.some((keyword) => contentLower.includes(keyword.toLowerCase()));
}

/**
 * Count code blocks and get max length
 * @param {string} content - The markdown content
 * @returns {Object} {count, maxLines}
 */
function analyzeCodeBlocks(content) {
  const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
  let match;
  let count = 0;
  let maxLines = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    count++;
    const lines = match[1].split('\n').length;
    maxLines = Math.max(maxLines, lines);
  }

  return { count, maxLines };
}

/**
 * Validate beginner level content
 * @param {Object} frontmatter - The frontmatter
 * @param {string} content - The content body
 * @returns {Object} {score, issues}
 */
function validateBeginner(frontmatter, content) {
  let score = 100;
  const issues = [];
  const { count: codeBlockCount, maxLines } = analyzeCodeBlocks(content);

  // Check for troubleshooting section
  if (!hasSection(content, ['troubleshoot', 'common issue', 'problem', 'error'])) {
    issues.push('❌ Missing troubleshooting section (required for beginner level)');
    score -= 15;
  }

  // Check for glossary or definitions
  if (
    !hasSection(content, [
      'glossary',
      'term',
      'definition',
      'what is',
      'explanation',
    ])
  ) {
    issues.push(
      '⚠️ Missing glossary or clear term definitions (recommended for beginner level)'
    );
    score -= 10;
  }

  // Check code block size
  if (maxLines > 50) {
    issues.push(
      `❌ Code blocks exceed 50 lines (max: ${maxLines} lines) - too complex for beginner`
    );
    score -= 20;
  }

  // Check for step-by-step format
  const stepsPattern = /(step|## \d+|1\.|first|then|next|finally)/gi;
  if (!stepsPattern.test(content)) {
    issues.push(
      '⚠️ Content does not follow clear step-by-step format (recommended for beginner level)'
    );
    score -= 10;
  }

  // Check for learning objectives
  if (
    !hasSection(content, ['objective', 'learning', 'goal', 'you will', 'after this'])
  ) {
    issues.push(
      '⚠️ Missing clear learning objectives or "you will learn" section'
    );
    score -= 5;
  }

  return {
    score: Math.max(0, score),
    issues,
    level: 'beginner',
    codeBlockCount,
    maxCodeBlockLines: maxLines,
  };
}

/**
 * Validate intermediate level content
 * @param {Object} frontmatter - The frontmatter
 * @param {string} content - The content body
 * @returns {Object} {score, issues}
 */
function validateIntermediate(frontmatter, content) {
  let score = 100;
  const issues = [];
  const { count: codeBlockCount, maxLines } = analyzeCodeBlocks(content);

  // Check for real-world scenario
  if (
    !hasSection(content, [
      'real-world',
      'scenario',
      'example',
      'use case',
      'practical',
    ])
  ) {
    issues.push(
      '❌ Missing real-world scenario or practical example (required for intermediate level)'
    );
    score -= 20;
  }

  // Check for explanation sections
  if (
    !hasSection(content, [
      'explanation',
      'how it work',
      'why',
      'architecture',
      'design',
    ])
  ) {
    issues.push(
      '❌ Missing explanation sections (required for intermediate level)'
    );
    score -= 15;
  }

  // Check code block size (50-300 lines expected)
  if (maxLines < 50) {
    issues.push(
      `⚠️ Code examples may be too simple (${maxLines} lines, intermediate expects 50-300)`
    );
    score -= 10;
  } else if (maxLines > 300) {
    issues.push(
      `❌ Code blocks exceed 300 lines (${maxLines} lines) - too complex for intermediate`
    );
    score -= 20;
  }

  // Check for extension challenges or "next steps"
  if (
    !hasSection(content, [
      'challenge',
      'extension',
      'exercise',
      'try',
      'next step',
    ])
  ) {
    issues.push(
      '⚠️ Missing extension challenges or exercises (recommended for intermediate level)'
    );
    score -= 10;
  }

  // Check for prerequisites
  if (!hasSection(content, ['prerequisite', 'before you start', 'required'])) {
    issues.push(
      '⚠️ Missing prerequisites or "before you start" section (recommended)'
    );
    score -= 5;
  }

  return {
    score: Math.max(0, score),
    issues,
    level: 'intermediate',
    codeBlockCount,
    maxCodeBlockLines: maxLines,
  };
}

/**
 * Validate advanced level content
 * @param {Object} frontmatter - The frontmatter
 * @param {string} content - The content body
 * @returns {Object} {score, issues}
 */
function validateAdvanced(frontmatter, content) {
  let score = 100;
  const issues = [];
  const { count: codeBlockCount, maxLines } = analyzeCodeBlocks(content);

  // Check for design decisions section
  if (
    !hasSection(content, [
      'design decision',
      'architecture',
      'trade-off',
      'why we chose',
    ])
  ) {
    issues.push(
      '❌ Missing design decisions section (required for advanced level)'
    );
    score -= 20;
  }

  // Check for production considerations
  if (
    !hasSection(content, [
      'production',
      'performance',
      'security',
      'scalability',
      'monitoring',
      'best practice',
    ])
  ) {
    issues.push(
      '❌ Missing production considerations (required for advanced level)'
    );
    score -= 20;
  }

  // Check code block size (300+ lines expected)
  if (maxLines < 300) {
    issues.push(
      `⚠️ Code examples may be too simple (${maxLines} lines, advanced expects 300+)`
    );
    score -= 15;
  }

  // Check for capstone project or major exercise
  if (
    !hasSection(content, [
      'capstone',
      'project',
      'build',
      'implement',
      'hands-on',
    ])
  ) {
    issues.push(
      '❌ Missing capstone project or major hands-on exercise (required for advanced level)'
    );
    score -= 20;
  }

  // Check for references or further reading
  if (!hasSection(content, ['reference', 'further reading', 'resource', 'link'])) {
    issues.push(
      '⚠️ Missing references or further reading section (recommended for advanced level)'
    );
    score -= 10;
  }

  // Check for testing/validation section
  if (!hasSection(content, ['test', 'validat', 'verif', 'quality'])) {
    issues.push(
      '⚠️ Missing testing or validation section (recommended for advanced level)'
    );
    score -= 5;
  }

  return {
    score: Math.max(0, score),
    issues,
    level: 'advanced',
    codeBlockCount,
    maxCodeBlockLines: maxLines,
  };
}

/**
 * Main validator function
 * @param {string} content - The full markdown content (with frontmatter)
 * @returns {Object} {score, issues, level, details}
 */
export function validateDifficulty(content) {
  const timestamp = new Date().toISOString();

  try {
    const { frontmatter, body } = parseFrontmatter(content);
    const difficulty = (frontmatter.difficulty || 'intermediate').toLowerCase();

    let result;

    switch (difficulty) {
      case 'beginner':
        result = validateBeginner(frontmatter, body);
        break;
      case 'intermediate':
        result = validateIntermediate(frontmatter, body);
        break;
      case 'advanced':
        result = validateAdvanced(frontmatter, body);
        break;
      default:
        return {
          score: 0,
          issues: [{ error: `Unknown difficulty level: ${difficulty}` }],
          level: difficulty,
          timestamp,
        };
    }

    console.log(
      `[${timestamp}] Difficulty validation complete (${difficulty}): score ${result.score}`
    );

    return {
      score: result.score,
      issues: result.issues,
      level: result.level,
      codeBlockCount: result.codeBlockCount,
      maxCodeBlockLines: result.maxCodeBlockLines,
      timestamp,
    };
  } catch (error) {
    console.error(`[${timestamp}] Difficulty validation failed:`, error.message);
    return {
      score: 0,
      issues: [
        {
          error: 'Validation failed',
          message: error.message,
        },
      ],
      timestamp,
    };
  }
}
