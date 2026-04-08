#!/usr/bin/env node

/**
 * Gap Report Generator
 * 
 * Analyzes feature coverage in the course catalog:
 * - Checks if each active feature has courses at all 3 difficulty levels
 * - Identifies features with partial coverage (missing levels)
 * - Detects stale courses (not verified in >30 days)
 * - Outputs gap-report.json with prioritized gaps and statistics
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Configuration
const DATA_DIR = path.join(process.cwd(), 'data');
const FEATURES_FILE = path.join(DATA_DIR, 'features.yaml');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.yaml');
const REPORT_FILE = path.join(DATA_DIR, 'gap-report.json');
const STALE_DAYS = 30;
const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];

/**
 * Log with timestamp
 */
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
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
 * Save JSON file
 */
function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  log(`Saved: ${filePath}`);
}

/**
 * Check if course is stale
 */
function isCourseStale(course) {
  if (!course.lastVerified) {
    return true; // No verification = stale
  }

  const lastVerified = new Date(course.lastVerified);
  const now = new Date();
  const daysSinceVerified = (now - lastVerified) / (1000 * 60 * 60 * 24);

  return daysSinceVerified > STALE_DAYS;
}

/**
 * Get courses for a specific feature and difficulty level
 */
function getCoursesForFeature(featureId, difficulty, catalog) {
  const courses = [];

  for (const [, courseList] of Object.entries(catalog)) {
    if (Array.isArray(courseList)) {
      for (const course of courseList) {
        if (
          course.featureId === featureId &&
          course.difficulty === difficulty &&
          course.status === 'active'
        ) {
          courses.push(course);
        }
      }
    }
  }

  return courses;
}

/**
 * Generate gap report
 */
function generateGapReport() {
  log('=== Gap Report Generator Started ===');

  try {
    // Load data
    const features = loadYaml(FEATURES_FILE);
    const catalog = loadYaml(CATALOG_FILE);

    const gaps = [];
    const stats = {
      totalFeatures: 0,
      coveredFeatures: 0,
      partiallyCovered: 0,
      uncoveredFeatures: 0,
      staleCourses: 0
    };

    // Filter to active features
    const activeFeatures = Object.entries(features)
      .filter(([, feature]) => feature.status !== 'deprecated')
      .map(([id, feature]) => ({ id, ...feature }));

    log(`Analyzing ${activeFeatures.length} active features...`);

    // Analyze each feature
    for (const feature of activeFeatures) {
      stats.totalFeatures++;

      const missingLevels = [];
      const staleCourses = [];
      let totalCourses = 0;

      // Check coverage for each difficulty level
      for (const difficulty of DIFFICULTY_LEVELS) {
        const courses = getCoursesForFeature(feature.id, difficulty, catalog);
        totalCourses += courses.length;

        if (courses.length === 0) {
          missingLevels.push(difficulty);
        } else {
          // Check for stale courses
          for (const course of courses) {
            if (isCourseStale(course)) {
              staleCourses.push(course.id);
              stats.staleCourses++;
            }
          }
        }
      }

      // Determine coverage status
      if (missingLevels.length === 3) {
        // No courses at all
        stats.uncoveredFeatures++;
        gaps.push({
          featureId: feature.id,
          featureName: feature.name,
          missingLevels: DIFFICULTY_LEVELS,
          staleCourses: [],
          priority: 'high',
          reason: 'Feature has no courses at any difficulty level'
        });

      } else if (missingLevels.length > 0) {
        // Partial coverage
        stats.partiallyCovered++;
        gaps.push({
          featureId: feature.id,
          featureName: feature.name,
          missingLevels,
          staleCourses,
          priority: 'medium',
          reason: `Missing courses for: ${missingLevels.join(', ')}`
        });

      } else if (staleCourses.length > 0) {
        // All levels covered but some courses are stale
        stats.coveredFeatures++;
        gaps.push({
          featureId: feature.id,
          featureName: feature.name,
          missingLevels: [],
          staleCourses,
          priority: 'low',
          reason: `${staleCourses.length} course(s) not verified in >30 days`
        });

      } else {
        // Fully covered and up-to-date
        stats.coveredFeatures++;
      }
    }

    // Sort gaps by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    gaps.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.featureName.localeCompare(b.featureName);
    });

    // Build report
    const report = {
      generatedAt: new Date().toISOString(),
      gaps,
      stats
    };

    // Save report
    saveJson(REPORT_FILE, report);

    // Print summary
    log('');
    log('=== Gap Report Complete ===');
    log(`Total features analyzed: ${stats.totalFeatures}`);
    log(`Fully covered: ${stats.coveredFeatures}`);
    log(`Partially covered: ${stats.partiallyCovered}`);
    log(`Not covered: ${stats.uncoveredFeatures}`);
    log(`Stale courses: ${stats.staleCourses}`);
    log('');
    log('Priority breakdown:');
    log(`  High (uncovered): ${gaps.filter(g => g.priority === 'high').length}`);
    log(`  Medium (partial): ${gaps.filter(g => g.priority === 'medium').length}`);
    log(`  Low (stale): ${gaps.filter(g => g.priority === 'low').length}`);
    log('');

    // Show top 10 gaps
    if (gaps.length > 0) {
      log('Top 10 gaps to address:');
      gaps.slice(0, 10).forEach((gap, i) => {
        const details = gap.missingLevels.length > 0
          ? `missing: ${gap.missingLevels.join(', ')}`
          : `stale: ${gap.staleCourses.length} course(s)`;
        log(`  ${i + 1}. [${gap.priority.toUpperCase()}] ${gap.featureName} (${details})`);
      });
    }

    log('');

  } catch (error) {
    log(`FATAL ERROR: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run report generation
generateGapReport().catch(error => {
  log(`FATAL ERROR: ${error.message}`);
  console.error(error);
  process.exit(1);
});
