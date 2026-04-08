/**
 * Difficulty Classification Engine
 * 
 * Applies classification rules to features and exports difficulty levels.
 * Rules are based on: feature_type, concept count, tool count, and time estimate.
 */

/**
 * Classification rules for each difficulty level
 */
const CLASSIFICATION_RULES = {
  beginner: {
    feature_types: ['getting_started', 'installation', 'first_use'],
    max_concepts: 2,
    max_tools: 1,
    max_time_minutes: 15
  },
  intermediate: {
    feature_types: ['workflow', 'integration', 'customization'],
    min_concepts: 3,
    max_concepts: 5,
    min_tools: 2,
    max_tools: 3,
    min_time_minutes: 15,
    max_time_minutes: 45
  },
  advanced: {
    feature_types: ['architecture', 'extension', 'plugin', 'multi_agent'],
    min_concepts: 6,
    min_tools: 4,
    min_time_minutes: 45
  }
};

/**
 * Content generation rules for each difficulty level
 */
const CONTENT_RULES = {
  beginner: {
    structure: 'step-by-step',
    keystroke_detail: 'every keystroke explained',
    includes_troubleshooting: true,
    includes_glossary: true,
    includes_prerequisites: true,
    includes_next_steps: true,
    example_complexity: 'simple',
    code_comments: 'extensive',
    estimated_read_time_minutes: '5-10'
  },
  intermediate: {
    structure: 'guided-exploration',
    keystroke_detail: 'key steps only',
    includes_troubleshooting: true,
    includes_glossary: false,
    includes_prerequisites: true,
    includes_next_steps: true,
    includes_why: true,
    includes_extensions: true,
    example_complexity: 'realistic',
    code_comments: 'moderate',
    estimated_read_time_minutes: '15-25'
  },
  advanced: {
    structure: 'open-ended',
    keystroke_detail: 'assumed knowledge',
    includes_troubleshooting: false,
    includes_glossary: false,
    includes_prerequisites: true,
    includes_next_steps: false,
    includes_design_decisions: true,
    includes_production_considerations: true,
    includes_capstone: true,
    example_complexity: 'production',
    code_comments: 'minimal',
    estimated_read_time_minutes: '30-45'
  }
};

/**
 * Parses time estimate string into minutes
 * Handles formats like "15 min", "15 minutes", "1 hour", etc.
 * 
 * @param {string} timeStr - Time estimate string
 * @returns {number} Time in minutes
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  
  const str = timeStr.toLowerCase().trim();
  
  // Check for hours
  const hourMatch = str.match(/(\d+)\s*hour/);
  if (hourMatch) {
    return parseInt(hourMatch[1]) * 60;
  }
  
  // Check for minutes
  const minMatch = str.match(/(\d+)\s*min/);
  if (minMatch) {
    return parseInt(minMatch[1]);
  }
  
  return 0;
}

/**
 * Classify feature difficulty based on multiple criteria
 * 
 * @param {object} feature - Feature object with properties like feature_type, concepts, tools, time_estimate
 * @returns {object} { level: 'beginner'|'intermediate'|'advanced', rules_matched: string[] }
 */
export function classifyDifficulty(feature) {
  if (!feature) {
    throw new Error('Feature object is required');
  }

  const {
    feature_type = '',
    concepts = [],
    tools = [],
    time_estimate = ''
  } = feature;

  const conceptCount = Array.isArray(concepts) ? concepts.length : 0;
  const toolCount = Array.isArray(tools) ? tools.length : 0;
  const timeMinutes = parseTimeToMinutes(time_estimate);

  const rulesMatched = [];

  // Check Advanced criteria first (most specific)
  const advancedRules = CLASSIFICATION_RULES.advanced;
  const isAdvancedType = advancedRules.feature_types.includes(feature_type);
  const isAdvancedConcepts = conceptCount >= advancedRules.min_concepts;
  const isAdvancedTools = toolCount >= advancedRules.min_tools;
  const isAdvancedTime = timeMinutes >= advancedRules.min_time_minutes;

  if (isAdvancedType && (isAdvancedConcepts || isAdvancedTools || isAdvancedTime)) {
    if (isAdvancedType) rulesMatched.push(`feature_type '${feature_type}' in advanced types`);
    if (isAdvancedConcepts) rulesMatched.push(`concepts (${conceptCount}) >= ${advancedRules.min_concepts}`);
    if (isAdvancedTools) rulesMatched.push(`tools (${toolCount}) >= ${advancedRules.min_tools}`);
    if (isAdvancedTime) rulesMatched.push(`time (${timeMinutes}min) >= ${advancedRules.min_time_minutes}min`);
    return {
      level: 'advanced',
      rules_matched: rulesMatched
    };
  }

  // Check Intermediate criteria
  const intermediateRules = CLASSIFICATION_RULES.intermediate;
  const isIntermediateType = intermediateRules.feature_types.includes(feature_type);
  const isIntermediateConcepts = conceptCount >= intermediateRules.min_concepts && conceptCount <= intermediateRules.max_concepts;
  const isIntermediateTools = toolCount >= intermediateRules.min_tools && toolCount <= intermediateRules.max_tools;
  const isIntermediateTime = timeMinutes >= intermediateRules.min_time_minutes && timeMinutes <= intermediateRules.max_time_minutes;

  if ((isIntermediateType || isIntermediateConcepts || isIntermediateTools) && !isAdvancedType) {
    if (isIntermediateType) rulesMatched.push(`feature_type '${feature_type}' in intermediate types`);
    if (isIntermediateConcepts) rulesMatched.push(`concepts (${conceptCount}) in range [${intermediateRules.min_concepts}-${intermediateRules.max_concepts}]`);
    if (isIntermediateTools) rulesMatched.push(`tools (${toolCount}) in range [${intermediateRules.min_tools}-${intermediateRules.max_tools}]`);
    if (isIntermediateTime) rulesMatched.push(`time (${timeMinutes}min) in range [${intermediateRules.min_time_minutes}-${intermediateRules.max_time_minutes}]min`);
    return {
      level: 'intermediate',
      rules_matched: rulesMatched
    };
  }

  // Check Beginner criteria
  const beginnerRules = CLASSIFICATION_RULES.beginner;
  const isBeginnerType = beginnerRules.feature_types.includes(feature_type);
  const isBeginnerConcepts = conceptCount <= beginnerRules.max_concepts;
  const isBeginnerTools = toolCount <= beginnerRules.max_tools;
  const isBeginnerTime = timeMinutes <= beginnerRules.max_time_minutes;

  if (isBeginnerType || (isBeginnerConcepts && isBeginnerTools && isBeginnerTime)) {
    if (isBeginnerType) rulesMatched.push(`feature_type '${feature_type}' in beginner types`);
    if (isBeginnerConcepts) rulesMatched.push(`concepts (${conceptCount}) <= ${beginnerRules.max_concepts}`);
    if (isBeginnerTools) rulesMatched.push(`tools (${toolCount}) <= ${beginnerRules.max_tools}`);
    if (isBeginnerTime) rulesMatched.push(`time (${timeMinutes}min) <= ${beginnerRules.max_time_minutes}min`);
    return {
      level: 'beginner',
      rules_matched: rulesMatched
    };
  }

  // Default to intermediate if no specific rules match
  rulesMatched.push('default fallback to intermediate');
  return {
    level: 'intermediate',
    rules_matched: rulesMatched
  };
}

/**
 * Get content generation rules for a given difficulty level
 * 
 * @param {string} level - Difficulty level: 'beginner', 'intermediate', or 'advanced'
 * @returns {object} Content rules for the level
 */
export function getContentRules(level) {
  if (!CONTENT_RULES[level]) {
    throw new Error(`Unknown difficulty level: ${level}`);
  }
  return structuredClone(CONTENT_RULES[level]);
}

/**
 * Get classification rules for a given difficulty level
 * 
 * @param {string} level - Difficulty level: 'beginner', 'intermediate', or 'advanced'
 * @returns {object} Classification rules for the level
 */
export function getClassificationRules(level) {
  if (!CLASSIFICATION_RULES[level]) {
    throw new Error(`Unknown difficulty level: ${level}`);
  }
  return structuredClone(CLASSIFICATION_RULES[level]);
}

// Export constants for reference
export { CLASSIFICATION_RULES, CONTENT_RULES };
