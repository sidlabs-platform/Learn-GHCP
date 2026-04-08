import fs from 'fs';
import path from 'path';

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);
const error = (msg) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`);

// Simple syntax validators for common languages
const validators = {
  javascript: (code) => {
    try {
      new Function(code);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  },
  
  python: (code) => {
    // Basic Python validation - check for common syntax issues
    const lines = code.split('\n');
    let indentStack = [0];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trimEnd();
      if (!line || line.trim().startsWith('#')) continue;
      
      const indent = line.length - line.trimStart().length;
      
      if (line.trim().endsWith(':')) {
        indentStack.push(indent);
      } else if (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
        indentStack.pop();
      }
    }
    
    return { valid: true }; // Basic validation only
  },
  
  json: (code) => {
    try {
      JSON.parse(code);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  },
  
  yaml: (code) => {
    // Basic YAML validation
    const lines = code.split('\n');
    for (const line of lines) {
      if (line.includes('\t')) {
        return { valid: false, error: 'YAML cannot contain tabs' };
      }
    }
    return { valid: true };
  },
  
  html: (code) => {
    // Check for basic HTML structure
    const openTags = code.match(/<([a-z][a-z0-9]*)/gi) || [];
    const closeTags = code.match(/<\/([a-z][a-z0-9]*)/gi) || [];
    
    // Simple heuristic - if drastically different counts, likely invalid
    if (openTags.length > 0 && closeTags.length === 0) {
      return { valid: false, error: 'Unclosed HTML tags detected' };
    }
    
    return { valid: true };
  },
  
  css: (code) => {
    // Basic CSS validation - check for balanced braces
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      return { valid: false, error: `Unbalanced braces: ${openBraces} open, ${closeBraces} close` };
    }
    
    return { valid: true };
  },
  
  bash: (code) => {
    // Basic bash validation - check for common issues
    if (code.includes('$(') && !code.includes(')')) {
      return { valid: false, error: 'Unclosed command substitution $(' };
    }
    return { valid: true };
  }
};

function extractCodeBlocks(content, filePath) {
  const codeBlocks = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  
  let match;
  let lineNum = 1;
  let lastIndex = 0;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] || 'text';
    const code = match[2];
    
    // Count newlines up to this match to get accurate line number
    lineNum += content.substring(lastIndex, match.index).split('\n').length - 1;
    
    codeBlocks.push({
      language: language.toLowerCase(),
      code: code.trim(),
      line: lineNum,
      file: filePath
    });
    
    lastIndex = codeBlockRegex.lastIndex;
    lineNum += code.split('\n').length;
  }
  
  return codeBlocks;
}

async function revalidateCode() {
  try {
    log('Starting code revalidation...');
    
    const coursesDir = path.join(process.cwd(), 'src', 'content', 'courses');
    const reportPath = path.join(process.cwd(), 'data', 'code-validation-report.json');
    
    if (!fs.existsSync(coursesDir)) {
      error(`Courses directory not found: ${coursesDir}`);
      return;
    }
    
    const validationResults = [];
    let totalBlocksChecked = 0;
    let validBlocksCount = 0;
    let failingBlocksCount = 0;
    
    // Recursively scan for markdown files
    function scanDirectory(dir) {
      const files = fs.readdirSync(dir);
      
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          scanDirectory(filePath);
        } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
          const relPath = path.relative(process.cwd(), filePath);
          log(`Scanning ${relPath}...`);
          
          const content = fs.readFileSync(filePath, 'utf8');
          const codeBlocks = extractCodeBlocks(content, relPath);
          
          codeBlocks.forEach((block) => {
            totalBlocksChecked++;
            const { language, code, line, file } = block;
            
            // Skip validation for unsupported languages or text blocks
            if (language === 'text' || !validators[language]) {
              return;
            }
            
            const validator = validators[language];
            const result = validator(code);
            
            if (result.valid) {
              validBlocksCount++;
              log(`  ✓ Valid ${language} block at ${file}:${line}`);
            } else {
              failingBlocksCount++;
              log(`  ✗ Invalid ${language} block at ${file}:${line}: ${result.error}`);
              validationResults.push({
                file,
                language,
                line,
                error: result.error,
                codePreview: code.substring(0, 100) + (code.length > 100 ? '...' : '')
              });
            }
          });
        }
      });
    }
    
    scanDirectory(coursesDir);
    
    // Write report
    const report = {
      generatedAt: new Date().toISOString(),
      totalCodeBlocksChecked: totalBlocksChecked,
      validBlocksCount,
      failingBlocksCount,
      validationRate: totalBlocksChecked > 0 
        ? Math.round((validBlocksCount / totalBlocksChecked) * 100)
        : 100,
      failures: validationResults,
      supportedLanguages: Object.keys(validators)
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    log(`Code validation report written to ${reportPath}`);
    log(`Summary: ${validBlocksChecked}/${totalBlocksChecked} code blocks passed validation (${report.validationRate}%)`);
    
    return report;
  } catch (err) {
    error(`Code revalidation failed: ${err.message}`);
    throw err;
  }
}

revalidateCode();
