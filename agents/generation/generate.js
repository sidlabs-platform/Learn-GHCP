/**
 * Course Generation Agent
 * 
 * Main orchestration script that:
 * 1. Reads gap-report.json for gaps to fill
 * 2. For each gap, generates course content at missing difficulty levels
 * 3. Updates catalog.yaml with new courses
 * 4. Updates learning-paths.yaml with prerequisite chains
 * 5. Implements rate limiting (max 10 courses per run)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import yaml from 'js-yaml';
import { classifyDifficulty, getContentRules } from './classify.js';
import { generateCourseTemplate } from './templates.js';
import { generateAndWriteLearningPaths } from './learning-paths.js';

/**
 * Configuration
 */
const CONFIG = {
  MAX_COURSES_PER_RUN: 10,
  DATA_DIR: './data',
  CONTENT_DIR: './src/content/courses',
  GAP_REPORT: './data/gap-report.json',
  CATALOG: './data/catalog.yaml',
  LEARNING_PATHS: './data/learning-paths.yaml'
};

/**
 * Logger with timestamps
 */
const logger = {
  log: (msg) => console.log(`[${new Date().toISOString()}] INFO: ${msg}`),
  error: (msg) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`),
  warn: (msg) => console.warn(`[${new Date().toISOString()}] WARN: ${msg}`),
  success: (msg) => console.log(`[${new Date().toISOString()}] ✓ ${msg}`)
};

/**
 * Ensure directory exists
 * 
 * @param {string} dir - Directory path
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Read JSON file
 * 
 * @param {string} filePath - Path to JSON file
 * @returns {object} Parsed JSON
 */
function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    logger.error(`Failed to read JSON: ${error.message}`);
    throw error;
  }
}

/**
 * Read YAML file
 * 
 * @param {string} filePath - Path to YAML file
 * @returns {object} Parsed YAML
 */
function readYAML(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      logger.warn(`YAML file not found, will create new: ${filePath}`);
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content);
  } catch (error) {
    logger.error(`Failed to read YAML: ${error.message}`);
    throw error;
  }
}

/**
 * Write YAML file
 * 
 * @param {string} filePath - Path where to write
 * @param {object} data - Data to write
 */
function writeYAML(filePath, data) {
  try {
    ensureDir(path.dirname(filePath));
    const yamlContent = yaml.dump(data, {
      indent: 2,
      lineWidth: -1,
      flowLevel: 2
    });
    fs.writeFileSync(filePath, yamlContent, 'utf8');
    logger.log(`Written to ${filePath}`);
  } catch (error) {
    logger.error(`Failed to write YAML: ${error.message}`);
    throw error;
  }
}

/**
 * Generate course content using Copilot CLI or fall back to template
 * 
 * @param {object} feature - Feature object
 * @param {string} level - Difficulty level
 * @param {object} contentRules - Content generation rules
 * @returns {string} Generated MDX content
 */
function generateCourseContent(feature, level, contentRules) {
  const promptTemplate = createGenerationPrompt(feature, level, contentRules);
  
  try {
    // Try to use Copilot CLI if available
    logger.log(`Invoking Copilot CLI for ${feature.id} (${level})`);
    
    // Create a temporary prompt file
    const promptFile = path.join(CONFIG.DATA_DIR, `prompt-${feature.id}-${level}.txt`);
    fs.writeFileSync(promptFile, promptTemplate, 'utf8');
    
    // Try Copilot CLI
    const command = `copilot-cli --mode autopilot --input "${promptFile}" --output-format markdown`;
    
    try {
      const output = execSync(command, {
        encoding: 'utf8',
        timeout: 30000
      });
      
      // Clean up
      fs.unlinkSync(promptFile);
      
      logger.success(`Generated ${feature.id} (${level}) via Copilot CLI`);
      return output;
    } catch (cliError) {
      // Clean up
      if (fs.existsSync(promptFile)) {
        fs.unlinkSync(promptFile);
      }
      
      logger.warn(`Copilot CLI not available or failed: ${cliError.message}`);
      logger.log('Falling back to template-based generation');
      return generateCourseTemplate(level, feature);
    }
  } catch (error) {
    logger.warn(`Content generation error: ${error.message}`);
    // Fall back to template
    return generateCourseTemplate(level, feature);
  }
}

/**
 * Create generation prompt for course content
 * 
 * @param {object} feature - Feature object
 * @param {string} level - Difficulty level
 * @param {object} contentRules - Content generation rules
 * @returns {string} Prompt text
 */
function createGenerationPrompt(feature, level, contentRules) {
  return `Generate a ${level}-level course for teaching "${feature.name}".

Feature ID: ${feature.id}
Feature Type: ${feature.feature_type}
Concepts: ${Array.isArray(feature.concepts) ? feature.concepts.join(', ') : feature.concepts}
Tools: ${Array.isArray(feature.tools) ? feature.tools.join(', ') : feature.tools}
Time Estimate: ${feature.time_estimate}

Content Requirements for ${level} level:
- Structure: ${contentRules.structure}
- Code Comment Detail: ${contentRules.code_comments}
- Include Troubleshooting: ${contentRules.includes_troubleshooting}
- Include Next Steps: ${contentRules.includes_next_steps}
- Estimated Read Time: ${contentRules.estimated_read_time_minutes}

${level === 'beginner' ? `
For beginner level:
- Explain every step and keystroke
- Include glossary links
- Include prerequisite information
- Include troubleshooting section
- Focus on building confidence
` : level === 'intermediate' ? `
For intermediate level:
- Explain the "why" not just the "how"
- Include real-world scenarios
- Include best practices
- Include extension challenges
- Link to beginner and advanced courses
` : `
For advanced level:
- Present open-ended problems
- Discuss design decisions and trade-offs
- Include production considerations
- Include capstone project
- Assume strong foundational knowledge
`}

Output format: Markdown/MDX with frontmatter containing title, description, difficulty, track, feature_id, prerequisites, and estimated_time.

Begin generating the course content:`;
}

/**
 * Save course content to file
 * 
 * @param {object} feature - Feature object
 * @param {string} level - Difficulty level
 * @param {string} content - Course content
 * @returns {string} File path where saved
 */
function saveCourseFile(feature, level, content) {
  const track = feature.track || 'general';
  const courseDir = path.join(CONFIG.CONTENT_DIR, track);
  ensureDir(courseDir);
  
  const fileName = `${feature.id}-${level}.mdx`;
  const filePath = path.join(courseDir, fileName);
  
  fs.writeFileSync(filePath, content, 'utf8');
  logger.success(`Saved course: ${filePath}`);
  
  return filePath;
}

/**
 * Extract course metadata from generated MDX
 * 
 * @param {string} content - MDX content
 * @param {object} feature - Feature object
 * @param {string} level - Difficulty level
 * @returns {object} Course metadata
 */
function extractMetadata(content, feature, level) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  
  if (!frontmatterMatch) {
    logger.warn('No frontmatter found in generated content');
  }
  
  const title = `${feature.name} - ${level.charAt(0).toUpperCase() + level.slice(1)}`;
  
  return {
    id: `${feature.track || 'general'}-${feature.id}-${level}`,
    title,
    feature_id: feature.id,
    feature_name: feature.name,
    difficulty: level,
    track: feature.track || 'general',
    description: `Learn ${feature.name} at ${level} level`,
    status: 'published',
    created_at: new Date().toISOString()
  };
}

/**
 * Update catalog with new course
 * 
 * @param {string} catalogPath - Path to catalog.yaml
 * @param {object} courseMetadata - Course metadata
 */
function updateCatalog(catalogPath, courseMetadata) {
  let catalog = readYAML(catalogPath);
  
  if (!catalog) {
    catalog = {
      version: '1.0',
      courses: []
    };
  }
  
  if (!catalog.courses) {
    catalog.courses = [];
  }
  
  // Check if course already exists
  const existingIndex = catalog.courses.findIndex(c => c.id === courseMetadata.id);
  
  if (existingIndex >= 0) {
    logger.log(`Updating existing course: ${courseMetadata.id}`);
    catalog.courses[existingIndex] = courseMetadata;
  } else {
    logger.log(`Adding new course: ${courseMetadata.id}`);
    catalog.courses.push(courseMetadata);
  }
  
  writeYAML(catalogPath, catalog);
}

/**
 * Get gaps that need course generation
 * 
 * @returns {object[]} Array of gaps to fill
 */
function getGapsToFill() {
  try {
    const gapReport = readJSON(CONFIG.GAP_REPORT);
    
    if (!gapReport || !gapReport.gaps) {
      logger.warn('No gaps found in gap report');
      return [];
    }
    
    return gapReport.gaps;
  } catch (error) {
    logger.error(`Failed to read gap report: ${error.message}`);
    return [];
  }
}

/**
 * Find missing difficulty levels for a feature
 * 
 * @param {object} feature - Feature object
 * @param {object} catalog - Current catalog
 * @returns {string[]} Array of missing levels
 */
function findMissingLevels(feature, catalog) {
  const allLevels = ['beginner', 'intermediate', 'advanced'];
  const courseIds = catalog.courses.map(c => c.id);
  
  const missingLevels = allLevels.filter(level => {
    const courseId = `${feature.track || 'general'}-${feature.id}-${level}`;
    return !courseIds.includes(courseId);
  });
  
  return missingLevels;
}

/**
 * Main generation process
 */
async function generateCourses() {
  logger.log('Starting Course Generation Agent');
  logger.log(`Max courses per run: ${CONFIG.MAX_COURSES_PER_RUN}`);
  
  try {
    // Ensure directories exist
    ensureDir(CONFIG.DATA_DIR);
    ensureDir(CONFIG.CONTENT_DIR);
    
    // Read current catalog
    logger.log(`Reading catalog from ${CONFIG.CATALOG}`);
    let catalog = readYAML(CONFIG.CATALOG);
    if (!catalog) {
      catalog = { version: '1.0', courses: [] };
    }
    
    // Get gaps to fill
    logger.log(`Reading gap report from ${CONFIG.GAP_REPORT}`);
    const gaps = getGapsToFill();
    
    if (gaps.length === 0) {
      logger.warn('No gaps found to fill');
      return;
    }
    
    logger.log(`Found ${gaps.length} gaps to fill`);
    
    // Process each gap
    let courseCount = 0;
    const generatedCourses = [];
    
    for (const gap of gaps) {
      if (courseCount >= CONFIG.MAX_COURSES_PER_RUN) {
        logger.warn(`Reached max courses per run (${CONFIG.MAX_COURSES_PER_RUN})`);
        break;
      }
      
      const feature = gap.feature;
      const missingLevels = findMissingLevels(feature, catalog);
      
      if (missingLevels.length === 0) {
        logger.log(`Feature "${feature.id}" already has all levels`);
        continue;
      }
      
      logger.log(`\nProcessing feature: ${feature.id}`);
      logger.log(`Missing levels: ${missingLevels.join(', ')}`);
      
      // Generate course for each missing level
      for (const level of missingLevels) {
        if (courseCount >= CONFIG.MAX_COURSES_PER_RUN) {
          logger.warn(`Reached max courses per run`);
          break;
        }
        
        try {
          logger.log(`\nGenerating ${level} course for ${feature.id}`);
          
          // Classify difficulty
          const classification = classifyDifficulty(feature);
          logger.log(`Classified as: ${classification.level}`);
          logger.log(`Rules matched: ${classification.rules_matched.join('; ')}`);
          
          // Get content rules
          const contentRules = getContentRules(level);
          
          // Generate content
          const content = generateCourseContent(feature, level, contentRules);
          
          // Save to file
          const filePath = saveCourseFile(feature, level, content);
          
          // Extract metadata
          const metadata = extractMetadata(content, feature, level);
          
          // Update catalog
          updateCatalog(CONFIG.CATALOG, metadata);
          
          generatedCourses.push({
            id: metadata.id,
            file: filePath,
            level
          });
          
          courseCount++;
          
          logger.success(`Course generated: ${metadata.id}`);
        } catch (error) {
          logger.error(`Failed to generate course for ${feature.id} (${level}): ${error.message}`);
        }
      }
    }
    
    // Update learning paths
    if (generatedCourses.length > 0) {
      logger.log(`\nUpdating learning paths after generating ${generatedCourses.length} courses`);
      try {
        generateAndWriteLearningPaths(CONFIG.CATALOG, CONFIG.LEARNING_PATHS);
        logger.success('Learning paths updated');
      } catch (error) {
        logger.error(`Failed to update learning paths: ${error.message}`);
      }
    }
    
    // Summary
    logger.log('\n' + '='.repeat(60));
    logger.log('Course Generation Complete');
    logger.log(`Generated ${generatedCourses.length} courses`);
    
    if (generatedCourses.length > 0) {
      logger.log('\nGenerated courses:');
      generatedCourses.forEach(course => {
        logger.log(`  - ${course.id} (${course.level})`);
      });
    }
    
    logger.success('All operations completed successfully');
    
  } catch (error) {
    logger.error(`Generation failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Command-line interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Support custom config via command line
  if (args.includes('--data-dir')) {
    const idx = args.indexOf('--data-dir');
    CONFIG.DATA_DIR = args[idx + 1];
  }
  
  if (args.includes('--content-dir')) {
    const idx = args.indexOf('--content-dir');
    CONFIG.CONTENT_DIR = args[idx + 1];
  }
  
  if (args.includes('--max-courses')) {
    const idx = args.indexOf('--max-courses');
    CONFIG.MAX_COURSES_PER_RUN = parseInt(args[idx + 1], 10);
  }
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Course Generation Agent');
    console.log('');
    console.log('Usage: node generate.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --data-dir <dir>      Data directory (default: ./data)');
    console.log('  --content-dir <dir>   Content output directory (default: ./src/content/courses)');
    console.log('  --max-courses <num>   Max courses per run (default: 10)');
    console.log('  --help, -h            Show this help message');
    console.log('');
    console.log('Example:');
    console.log('  node generate.js --max-courses 5');
    process.exit(0);
  }
  
  logger.log('Configuration:');
  logger.log(`  Data dir: ${CONFIG.DATA_DIR}`);
  logger.log(`  Content dir: ${CONFIG.CONTENT_DIR}`);
  logger.log(`  Max courses per run: ${CONFIG.MAX_COURSES_PER_RUN}`);
  logger.log('');
  
  await generateCourses();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    logger.error(error.message);
    process.exit(1);
  });
}

export { generateCourses };
