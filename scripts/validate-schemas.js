#!/usr/bin/env node

/**
 * Schema Validation Script for Learn-GHCP Data Registry
 * 
 * Validates all YAML data files against Zod schemas to ensure data integrity.
 * Runs on pre-commit or CI/CD to catch invalid registry entries early.
 * 
 * Usage: node scripts/validate-schemas.js
 * Exit codes:
 *   0 = all files valid
 *   1 = validation errors found
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { z } = require('zod');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

/**
 * Zod Schemas for Data Validation
 */

const SourceSchema = z.object({
  id: z.string().min(1, 'id is required'),
  name: z.string().min(1, 'name is required'),
  url: z.string().url('url must be a valid URL'),
  type: z.enum(['docs', 'blog', 'github_releases', 'marketplace']),
  crawlFrequency: z.enum(['daily', 'weekly', 'monthly']),
  lastCrawled: z.string().datetime().nullable(),
  status: z.enum(['active', 'inactive', 'archived']),
  confidenceScore: z.number().min(0).max(1, 'confidenceScore must be between 0 and 1'),
  tags: z.array(z.string()).min(1, 'tags must have at least one entry'),
});

const SourcesFileSchema = z.object({
  sources: z.array(SourceSchema).min(1, 'sources array must not be empty'),
});

const FeatureSchema = z.object({
  id: z.string().min(1, 'id is required'),
  name: z.string().min(1, 'name is required'),
  description: z.string().min(1, 'description is required'),
  category: z.enum(['core', 'cli', 'agents', 'extensibility', 'github']),
  status: z.enum(['active', 'inactive', 'deprecated']),
  discoveredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'discoveredAt must be YYYY-MM-DD format'),
  lastVerified: z.string().datetime().nullable(),
  sources: z.array(z.string()).min(1, 'sources must have at least one entry'),
  relatedFeatures: z.array(z.string()),
});

const FeaturesFileSchema = z.object({
  features: z.array(FeatureSchema).min(1, 'features array must not be empty'),
});

const CourseSchema = z.object({
  id: z.string().min(1, 'id is required'),
  name: z.string().min(1, 'name is required'),
  description: z.string().min(1, 'description is required'),
  features: z.array(z.string()).min(1, 'features must have at least one entry'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  duration: z.number().positive('duration must be positive'),
  track: z.enum(['core', 'cli', 'agents', 'extensibility', 'github']),
  tags: z.array(z.string()).min(1, 'tags must have at least one entry'),
  prerequisites: z.array(z.string()),
  source: z.string().min(1, 'source is required'),
});

const CatalogFileSchema = z.object({
  courses: z.array(CourseSchema),
});

const LearningPathSchema = z.object({
  id: z.string().min(1, 'id is required'),
  name: z.string().min(1, 'name is required'),
  description: z.string().min(1, 'description is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  track: z.enum(['core', 'cli', 'agents', 'extensibility', 'github']),
  courses: z.array(z.string()).min(1, 'courses must have at least one entry'),
  estimatedDuration: z.number().positive('estimatedDuration must be positive'),
  learningOutcomes: z.array(z.string()).min(1, 'learningOutcomes must have at least one entry'),
});

const LearningPathsFileSchema = z.object({
  paths: z.array(LearningPathSchema),
});

/**
 * Validation Configuration
 */

const validationConfigs = [
  {
    name: 'sources.yaml',
    filePath: path.join(__dirname, '..', 'data', 'sources.yaml'),
    schema: SourcesFileSchema,
  },
  {
    name: 'features.yaml',
    filePath: path.join(__dirname, '..', 'data', 'features.yaml'),
    schema: FeaturesFileSchema,
  },
  {
    name: 'catalog.yaml',
    filePath: path.join(__dirname, '..', 'data', 'catalog.yaml'),
    schema: CatalogFileSchema,
  },
  {
    name: 'learning-paths.yaml',
    filePath: path.join(__dirname, '..', 'data', 'learning-paths.yaml'),
    schema: LearningPathsFileSchema,
  },
];

/**
 * Main Validation Logic
 */

function validateFile(config) {
  try {
    // Check if file exists
    if (!fs.existsSync(config.filePath)) {
      return {
        success: false,
        error: `File not found: ${config.filePath}`,
      };
    }

    // Read and parse YAML
    const fileContent = fs.readFileSync(config.filePath, 'utf8');
    let data;
    try {
      data = yaml.load(fileContent);
    } catch (yamlError) {
      return {
        success: false,
        error: `YAML parsing error: ${yamlError.message}`,
      };
    }

    // Validate against schema
    const result = config.schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors
        .map((err) => {
          const path = err.path.length > 0 ? `[${err.path.join('.')}]` : 'root';
          return `  ${path}: ${err.message}`;
        })
        .join('\n');
      return {
        success: false,
        error: `Validation errors:\n${errors}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error.message}`,
    };
  }
}

function main() {
  console.log(`${colors.blue}=== Learn-GHCP Data Registry Validation ===${colors.reset}\n`);

  let allValid = true;
  const results = [];

  for (const config of validationConfigs) {
    const result = validateFile(config);
    results.push({ name: config.name, ...result });

    const statusIcon = result.success ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`${statusIcon} ${config.name}`);

    if (!result.success) {
      console.log(`  ${colors.red}${result.error}${colors.reset}`);
      allValid = false;
    }
  }

  console.log();

  // Summary
  const passCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  if (allValid) {
    console.log(
      `${colors.green}✓ All ${totalCount} files validated successfully${colors.reset}\n`
    );
    process.exit(0);
  } else {
    console.log(
      `${colors.red}✗ Validation failed: ${passCount}/${totalCount} files passed${colors.reset}\n`
    );
    process.exit(1);
  }
}

main();
