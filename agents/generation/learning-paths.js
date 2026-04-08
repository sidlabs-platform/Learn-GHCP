/**
 * Learning Path Generator
 * 
 * Reads catalog and generates learning paths:
 * - Feature-level paths: beginner → intermediate → advanced
 * - Track-level paths: chain features within a track
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/**
 * Logger with timestamps
 */
const logger = {
  log: (msg) => console.log(`[${new Date().toISOString()}] INFO: ${msg}`),
  error: (msg) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`),
  warn: (msg) => console.warn(`[${new Date().toISOString()}] WARN: ${msg}`)
};

/**
 * Parse course ID to extract feature and level
 * Format: {track}-{feature}-{level} or {feature}-{level}
 * 
 * @param {string} courseId - Course ID
 * @returns {object} { feature, level, track }
 */
function parseCourseId(courseId) {
  const parts = courseId.split('-');
  
  // Check if last part is a level
  const lastPart = parts[parts.length - 1];
  const levels = ['beginner', 'intermediate', 'advanced'];
  
  if (!levels.includes(lastPart)) {
    logger.warn(`Course ID "${courseId}" doesn't end with a difficulty level`);
    return null;
  }
  
  const level = lastPart;
  const remainingParts = parts.slice(0, -1);
  
  // If we have at least 2 parts remaining, first might be track
  if (remainingParts.length >= 2) {
    const track = remainingParts[0];
    const feature = remainingParts.slice(1).join('-');
    return { feature, level, track };
  } else if (remainingParts.length === 1) {
    const feature = remainingParts[0];
    return { feature, level, track: null };
  }
  
  return null;
}

/**
 * Group courses by feature
 * 
 * @param {object[]} courses - Array of course objects
 * @returns {object} Map of feature -> levels array
 */
function groupCoursesByFeature(courses) {
  const grouped = {};
  
  courses.forEach(course => {
    const parsed = parseCourseId(course.id);
    if (!parsed) return;
    
    const { feature, level, track } = parsed;
    
    if (!grouped[feature]) {
      grouped[feature] = {
        track: track || course.track || 'general',
        levels: {}
      };
    }
    
    grouped[feature].levels[level] = {
      courseId: course.id,
      title: course.title || course.id,
      description: course.description || ''
    };
  });
  
  return grouped;
}

/**
 * Generate learning paths from grouped courses
 * 
 * @param {object} groupedCourses - Courses grouped by feature
 * @returns {object[]} Array of learning path objects
 */
function generateFeaturePaths(groupedCourses) {
  const paths = [];
  const levelOrder = ['beginner', 'intermediate', 'advanced'];
  
  Object.entries(groupedCourses).forEach(([feature, featureData]) => {
    const { track, levels } = featureData;
    const availableLevels = Object.keys(levels);
    
    if (availableLevels.length === 0) {
      logger.warn(`Feature "${feature}" has no courses`);
      return;
    }
    
    // Create path ID from track and feature
    const pathId = track && track !== 'general'
      ? `${track}-${feature}-path`
      : `${feature}-path`;
    
    // Create human-readable path name
    const pathName = feature
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') + ' Mastery';
    
    const courses = [];
    let order = 1;
    
    // Add courses in level order
    levelOrder.forEach(level => {
      if (levels[level]) {
        courses.push({
          courseId: levels[level].courseId,
          level,
          order,
          title: levels[level].title,
          description: levels[level].description
        });
        order++;
      }
    });
    
    paths.push({
      id: pathId,
      name: pathName,
      track,
      feature,
      type: 'feature',
      courses,
      created_at: new Date().toISOString()
    });
  });
  
  return paths;
}

/**
 * Generate track-level learning paths
 * Chain features together within a track
 * 
 * @param {object} groupedCourses - Courses grouped by feature
 * @returns {object[]} Array of track-level path objects
 */
function generateTrackPaths(groupedCourses) {
  const trackMap = {};
  
  // Group features by track
  Object.entries(groupedCourses).forEach(([feature, featureData]) => {
    const { track } = featureData;
    if (!trackMap[track]) {
      trackMap[track] = [];
    }
    trackMap[track].push(feature);
  });
  
  const paths = [];
  
  Object.entries(trackMap).forEach(([track, features]) => {
    if (track === 'general' || features.length < 2) {
      // Skip general track and tracks with single feature
      return;
    }
    
    const pathId = `${track}-complete-path`;
    const pathName = track
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') + ' Complete';
    
    const courses = [];
    let order = 1;
    
    // Add all features in the track, at intermediate level if available
    features.forEach((feature, idx) => {
      const featureData = groupedCourses[feature];
      const levels = featureData.levels;
      
      // Prefer intermediate, fall back to beginner or advanced
      const level = levels.intermediate
        ? 'intermediate'
        : (levels.beginner ? 'beginner' : 'advanced');
      
      if (levels[level]) {
        courses.push({
          courseId: levels[level].courseId,
          feature,
          level,
          order,
          title: levels[level].title,
          description: levels[level].description
        });
        order++;
      }
    });
    
    if (courses.length > 0) {
      paths.push({
        id: pathId,
        name: pathName,
        track,
        type: 'track',
        courses,
        description: `Complete learning path for ${track}. Covers all major features and concepts.`,
        created_at: new Date().toISOString()
      });
    }
  });
  
  return paths;
}

/**
 * Read catalog YAML file
 * 
 * @param {string} catalogPath - Path to catalog.yaml
 * @returns {object[]} Array of course objects
 */
export function readCatalog(catalogPath) {
  try {
    const content = fs.readFileSync(catalogPath, 'utf8');
    const data = yaml.load(content);
    
    if (!data || !data.courses) {
      logger.warn(`Catalog has no "courses" section`);
      return [];
    }
    
    return data.courses;
  } catch (error) {
    logger.error(`Failed to read catalog: ${error.message}`);
    throw error;
  }
}

/**
 * Generate complete learning paths
 * 
 * @param {object[]} courses - Array of course objects from catalog
 * @returns {object} { feature_paths: [], track_paths: [] }
 */
export function generateLearningPaths(courses) {
  if (!Array.isArray(courses) || courses.length === 0) {
    logger.warn('No courses provided for learning path generation');
    return { feature_paths: [], track_paths: [] };
  }
  
  const grouped = groupCoursesByFeature(courses);
  const feature_paths = generateFeaturePaths(grouped);
  const track_paths = generateTrackPaths(grouped);
  
  logger.log(`Generated ${feature_paths.length} feature paths`);
  logger.log(`Generated ${track_paths.length} track paths`);
  
  return { feature_paths, track_paths };
}

/**
 * Create learning paths YAML structure
 * 
 * @param {object} paths - { feature_paths: [], track_paths: [] }
 * @returns {object} YAML-compatible structure
 */
export function createLearningPathsStructure(paths) {
  const allPaths = [
    ...(paths.feature_paths || []),
    ...(paths.track_paths || [])
  ];
  
  return {
    version: '1.0',
    description: 'Learning paths for GitHub Copilot learning platform',
    generated_at: new Date().toISOString(),
    paths: allPaths
  };
}

/**
 * Write learning paths to YAML file
 * 
 * @param {string} outputPath - Path where to write learning-paths.yaml
 * @param {object} structure - Learning paths structure
 */
export function writeLearningPaths(outputPath, structure) {
  try {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const yamlContent = yaml.dump(structure, {
      indent: 2,
      lineWidth: -1,
      flowLevel: 2
    });
    
    fs.writeFileSync(outputPath, yamlContent, 'utf8');
    logger.log(`Learning paths written to ${outputPath}`);
  } catch (error) {
    logger.error(`Failed to write learning paths: ${error.message}`);
    throw error;
  }
}

/**
 * Generate learning paths from catalog and write to file
 * Main entry point
 * 
 * @param {string} catalogPath - Path to catalog.yaml
 * @param {string} outputPath - Path where to write learning-paths.yaml
 * @returns {object} Generated learning paths structure
 */
export function generateAndWriteLearningPaths(catalogPath, outputPath) {
  logger.log(`Reading catalog from ${catalogPath}`);
  const courses = readCatalog(catalogPath);
  
  logger.log(`Generating learning paths from ${courses.length} courses`);
  const paths = generateLearningPaths(courses);
  
  const structure = createLearningPathsStructure(paths);
  writeLearningPaths(outputPath, structure);
  
  return structure;
}

/**
 * Command-line interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node learning-paths.js <catalog-path> <output-path>');
    console.log('');
    console.log('Example:');
    console.log('  node learning-paths.js data/catalog.yaml data/learning-paths.yaml');
    process.exit(1);
  }
  
  const [catalogPath, outputPath] = args;
  
  try {
    const structure = generateAndWriteLearningPaths(catalogPath, outputPath);
    
    const totalPaths = structure.paths.length;
    const featurePaths = structure.paths.filter(p => p.type === 'feature').length;
    const trackPaths = structure.paths.filter(p => p.type === 'track').length;
    
    console.log('');
    console.log('✓ Learning paths generation complete');
    console.log(`  Total paths: ${totalPaths}`);
    console.log(`  Feature paths: ${featurePaths}`);
    console.log(`  Track paths: ${trackPaths}`);
    process.exit(0);
  } catch (error) {
    logger.error(`Generation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    logger.error(error.message);
    process.exit(1);
  });
}
