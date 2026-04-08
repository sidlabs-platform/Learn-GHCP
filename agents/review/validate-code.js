/**
 * Code Block Validator
 * Validates code blocks in markdown content for correctness and anti-patterns
 */

import { execSync } from 'child_process';

/**
 * Extract code blocks from markdown
 * @param {string} markdownContent - The markdown content
 * @returns {Array} Array of {language, code, lineNumber}
 */
function extractCodeBlocks(markdownContent) {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const blocks = [];
  let match;
  let lineNumber = 1;

  while ((match = codeBlockRegex.exec(markdownContent)) !== null) {
    const language = match[1] || 'text';
    const code = match[2];
    const linesBefore = markdownContent.substring(0, match.index).split('\n').length;

    blocks.push({
      language,
      code: code.trim(),
      lineNumber: linesBefore,
      index: blocks.length,
    });
  }

  return blocks;
}

/**
 * Check for common anti-patterns
 * @param {string} code - The code to check
 * @param {string} language - The programming language
 * @returns {Array} Array of issues found
 */
function checkAntiPatterns(code, language) {
  const issues = [];

  // Check for hardcoded secrets/credentials
  const secretPatterns = [
    /password\s*=\s*["'][\w\d]+["']/gi,
    /api[_-]?key\s*=\s*["'][\w\d]+["']/gi,
    /secret\s*=\s*["'][\w\d]+["']/gi,
    /token\s*=\s*["'][\w\d]+["']/gi,
    /(sk_[a-z0-9]{20,}|pk_[a-z0-9]{20,})/gi,
  ];

  secretPatterns.forEach((pattern) => {
    if (pattern.test(code)) {
      issues.push('⚠️ Potential hardcoded secrets or credentials detected');
    }
  });

  // Check for TODO/FIXME left in code
  const todoPattern = /\/\/\s*(TODO|FIXME|HACK|XXX)/gi;
  if (todoPattern.test(code)) {
    issues.push('⚠️ TODO/FIXME/HACK comments left in code');
  }

  // Check for console.log left in production code (for non-demo languages)
  if (
    (language === 'javascript' || language === 'js') &&
    /console\.(log|debug|info)/gi.test(code)
  ) {
    issues.push('⚠️ console.log() statements left in code (should use proper logging)');
  }

  // Check for debugging breakpoints
  if (/debugger\s*[;:]?/gi.test(code)) {
    issues.push('⚠️ debugger statement left in code');
  }

  // Check for infinite loops (basic check)
  if (/while\s*\(\s*true\s*\)/gi.test(code)) {
    issues.push('⚠️ Infinite while(true) loop detected');
  }

  return issues;
}

/**
 * Check basic syntax validity
 * @param {string} code - The code to check
 * @param {string} language - The programming language
 * @returns {Array} Array of issues found
 */
function checkSyntaxValidity(code, language) {
  const issues = [];

  // Check matching braces/brackets/parentheses
  let braceCount = 0,
    bracketCount = 0,
    parenCount = 0;
  let inString = false,
    stringChar = null;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];

    // Handle strings
    if ((char === '"' || char === "'" || char === '`') && code[i - 1] !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }

    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
    }
  }

  if (braceCount !== 0) {
    issues.push(
      `❌ Mismatched braces: ${braceCount > 0 ? 'missing' : 'extra'} closing braces`
    );
  }
  if (bracketCount !== 0) {
    issues.push(
      `❌ Mismatched brackets: ${bracketCount > 0 ? 'missing' : 'extra'} closing brackets`
    );
  }
  if (parenCount !== 0) {
    issues.push(
      `❌ Mismatched parentheses: ${parenCount > 0 ? 'missing' : 'extra'} closing parentheses`
    );
  }

  return issues;
}

/**
 * Calculate code block score
 * @param {Array} blocks - Array of code blocks
 * @returns {Object} {score, issues}
 */
function scoreCodeBlocks(blocks) {
  let issues = [];
  let totalScore = 100;

  if (blocks.length === 0) {
    return { score: 100, issues: [], blockCount: 0 };
  }

  blocks.forEach((block, idx) => {
    const syntaxIssues = checkSyntaxValidity(block.code, block.language);
    const antiPatternIssues = checkAntiPatterns(block.code, block.language);
    const blockIssues = [...syntaxIssues, ...antiPatternIssues];

    if (blockIssues.length > 0) {
      issues.push({
        blockIndex: idx,
        language: block.language,
        line: block.lineNumber,
        issues: blockIssues,
      });

      totalScore -= blockIssues.length * 5; // Deduct 5 points per issue
    }
  });

  return {
    score: Math.max(0, totalScore),
    issues,
    blockCount: blocks.length,
  };
}

/**
 * Main validator function
 * @param {string} markdownContent - The markdown content to validate
 * @returns {Object} {score, issues, codeBlockCount}
 */
export function validateCodeBlocks(markdownContent) {
  const timestamp = new Date().toISOString();

  try {
    const blocks = extractCodeBlocks(markdownContent);
    const result = scoreCodeBlocks(blocks);

    console.log(`[${timestamp}] Code validation complete: ${result.blockCount} blocks, score: ${result.score}`);

    return {
      score: result.score,
      issues: result.issues,
      codeBlockCount: result.blockCount,
      timestamp,
    };
  } catch (error) {
    console.error(`[${timestamp}] Code validation failed:`, error.message);
    return {
      score: 0,
      issues: [
        {
          error: 'Validation failed',
          message: error.message,
        },
      ],
      codeBlockCount: 0,
      timestamp,
    };
  }
}
