/**
 * Course Template Generator
 * 
 * Generates MDX course content at different difficulty levels.
 * Each template follows distinct pedagogical approaches.
 */

/**
 * Generate frontmatter for MDX course
 * 
 * @param {object} opts - Options
 * @param {string} opts.title - Course title
 * @param {string} opts.description - Course description
 * @param {string} opts.difficulty - Difficulty level
 * @param {string} opts.track - Track name
 * @param {string} opts.feature_id - Feature identifier
 * @param {string[]} opts.prerequisites - Prerequisites
 * @param {string} opts.estimated_time - Estimated time to complete
 * @returns {string} YAML frontmatter
 */
function generateFrontmatter(opts) {
  const {
    title,
    description,
    difficulty,
    track,
    feature_id,
    prerequisites = [],
    estimated_time = ''
  } = opts;

  const prerequisites_str = prerequisites.length > 0
    ? `prerequisites:\n${prerequisites.map(p => `  - ${p}`).join('\n')}`
    : 'prerequisites: []';

  return `---
title: "${title}"
description: "${description}"
difficulty: ${difficulty}
track: ${track}
feature_id: ${feature_id}
${prerequisites_str}
${estimated_time ? `estimated_time: "${estimated_time}"` : ''}
created_at: ${new Date().toISOString()}
---`;
}

/**
 * Generate beginner-level course template
 * 
 * Pedagogical approach: Step-by-step, every keystroke explained
 * Target: Users new to the feature
 * Structure: Setup → Steps → Troubleshooting → Next Steps
 * 
 * @param {object} feature - Feature object
 * @param {object} opts - Override options
 * @returns {string} MDX course content
 */
export function generateBeginnerTemplate(feature, opts = {}) {
  const {
    title = `${feature.name} - Getting Started`,
    description = `Learn the basics of ${feature.name} step by step`,
    track = feature.track || 'copilot-cli',
    feature_id = feature.id,
    prerequisites = [],
    estimated_time = '10 min',
    learning_objectives = feature.learning_objectives || [],
    key_concepts = feature.concepts || [],
    troubleshooting_tips = feature.troubleshooting || []
  } = opts;

  const frontmatter = generateFrontmatter({
    title,
    description,
    difficulty: 'beginner',
    track,
    feature_id,
    prerequisites,
    estimated_time
  });

  const prerequisites_section = prerequisites.length > 0
    ? `## Prerequisites

Before you start, make sure you have:

${prerequisites.map(p => `- ${p}`).join('\n')}

`
    : '';

  const objectives_section = learning_objectives.length > 0
    ? `## What You'll Learn

By the end of this course, you'll be able to:

${learning_objectives.map(obj => `- ${obj}`).join('\n')}

`
    : '';

  const concepts_glossary = key_concepts.length > 0
    ? `## Key Concepts

${key_concepts.map(concept => `- **${concept.name || concept}**: ${concept.description || 'See glossary for details'}`).join('\n')}

`
    : '';

  const troubleshooting_section = troubleshooting_tips.length > 0
    ? `## Troubleshooting

### Common Issues

${troubleshooting_tips.map((tip, i) => {
      const label = typeof tip === 'string' ? tip : tip.issue;
      const solution = typeof tip === 'string' ? 'See documentation' : tip.solution;
      return `**Problem ${i + 1}: ${label}**
> ${solution}`;
    }).join('\n\n')}

`
    : '';

  return `${frontmatter}

# ${title}

${description}

⏱️ **Time to complete:** ${estimated_time}

---

${prerequisites_section}${objectives_section}## Getting Started

Let's get you up and running with ${feature.name}. This guide walks through every step.

### Step 1: Preparation

Before we begin, let's prepare your environment:

\`\`\`bash
# Verify your current setup
which copilot-cli
copilot-cli --version
\`\`\`

**What this does:** 
- \`which copilot-cli\` - Finds where the Copilot CLI is installed on your system
- \`--version\` - Checks which version you have

### Step 2: Basic Usage

Now let's try the basic command:

\`\`\`bash
# Run this command
copilot-cli ${feature_id} --help
\`\`\`

**What you should see:**
- A help message showing available options
- If this doesn't work, go to the Troubleshooting section below

**Breaking it down:**
- \`copilot-cli\` - The command to run
- \`${feature_id}\` - The specific feature name
- \`--help\` - Shows documentation

### Step 3: Your First Action

Try this command and describe what happens:

\`\`\`bash
# Your first command
copilot-cli ${feature_id}
\`\`\`

🎉 **Congratulations!** You've successfully used ${feature.name}.

${concepts_glossary}## Practice Exercise

Try to:

1. Run the command from Step 3 again
2. Notice what changed from the first time
3. Try adding \`--verbose\` flag to see more details

\`\`\`bash
copilot-cli ${feature_id} --verbose
\`\`\`

${troubleshooting_section}## Key Takeaways

- ✅ You know how to use ${feature.name}
- ✅ You understand the basic workflow
- ✅ You can now explore advanced features

---

## Next Steps

You've mastered the basics! Ready for more?

### 📚 Continue Learning

- **Next Course:** [${feature.name} - Workflow Fundamentals](/courses/${track}/${feature_id}-intermediate) (Intermediate)
- **Related Topics:** Browse other courses in the ${track} track
- **Documentation:** [Full ${feature.name} docs](${feature.documentation_url || '#'})

### 💡 Try It Out

- Practice this technique with your own projects
- Share what you learned with your team
- Come back to this guide anytime you need a refresher

---

## Need Help?

- 💬 Join the community: [GitHub Discussions](https://github.com/copilot/discussions)
- 📖 Read the [full documentation](${feature.documentation_url || '#'})
- 🐛 Report issues: [GitHub Issues](https://github.com/copilot/issues)
`;
}

/**
 * Generate intermediate-level course template
 * 
 * Pedagogical approach: Guided exploration, real-world scenarios, "why not just how"
 * Target: Users with basic understanding
 * Structure: Context → Guided Steps → Why This Matters → Extensions → Next Steps
 * 
 * @param {object} feature - Feature object
 * @param {object} opts - Override options
 * @returns {string} MDX course content
 */
export function generateIntermediateTemplate(feature, opts = {}) {
  const {
    title = `${feature.name} - Workflow Fundamentals`,
    description = `Master real-world workflows with ${feature.name}`,
    track = feature.track || 'copilot-cli',
    feature_id = feature.id,
    prerequisites = [`${feature_id}-beginner`],
    estimated_time = '20 min',
    scenario = feature.scenario || `Learn how to effectively use ${feature.name} in your daily workflow`,
    learning_objectives = feature.learning_objectives || [],
    best_practices = feature.best_practices || [],
    extensions = feature.extensions || []
  } = opts;

  const frontmatter = generateFrontmatter({
    title,
    description,
    difficulty: 'intermediate',
    track,
    feature_id,
    prerequisites,
    estimated_time
  });

  const prerequisites_section = prerequisites.length > 0
    ? `## Prerequisites

This course assumes you know:

${prerequisites.map(p => `- [${p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}](/courses/${track}/${p})`).join('\n')}

Not ready? Start with the beginner course.

`
    : '';

  const objectives_section = learning_objectives.length > 0
    ? `## What You'll Achieve

${learning_objectives.map(obj => `- ${obj}`).join('\n')}

`
    : '';

  const best_practices_section = best_practices.length > 0
    ? `## Best Practices

${best_practices.map(practice => {
      const label = typeof practice === 'string' ? practice : practice.name;
      const details = typeof practice === 'string' ? '' : practice.details;
      return `### ${label}

${details || 'Apply this best practice to improve your workflow.'}`;
    }).join('\n\n')}

`
    : '';

  const extensions_section = extensions.length > 0
    ? `## Extension Challenges

Want to go deeper? Try these challenges:

${extensions.map((ext, i) => {
      const description = typeof ext === 'string' ? ext : ext.description;
      const hint = typeof ext === 'string' ? '' : ext.hint;
      return `**Challenge ${i + 1}: ${description}**
${hint ? `_Hint: ${hint}_` : ''}`;
    }).join('\n\n')}

`
    : '';

  return `${frontmatter}

# ${title}

${description}

⏱️ **Time to complete:** ${estimated_time}

---

${prerequisites_section}## Real-World Scenario

${scenario}

In this course, we'll explore how to:

${objectives_section}## Why This Matters

Before diving into the "how," let's understand the "why":

- **Efficiency**: These techniques save you time on repetitive tasks
- **Quality**: Following established patterns leads to better results
- **Collaboration**: Standard workflows make it easier to work with your team
- **Scalability**: These approaches work whether you're on a team of 1 or 100

## Guided Workflow

### Step 1: Setup Your Context

Start by understanding what you're working with:

\`\`\`bash
# Check your current configuration
copilot-cli config get

# Show your working environment
copilot-cli ${feature_id} --show-context
\`\`\`

### Step 2: Execute the Workflow

Now let's run through the actual workflow:

\`\`\`bash
# Initialize or configure for this session
copilot-cli ${feature_id} --init

# Execute the primary task
copilot-cli ${feature_id} --execute

# Verify the results
copilot-cli ${feature_id} --verify
\`\`\`

### Step 3: Optimize Your Approach

Once the basic workflow works, consider:

\`\`\`bash
# Profile to see performance metrics
copilot-cli ${feature_id} --profile

# Run with optimizations
copilot-cli ${feature_id} --execute --optimize
\`\`\`

${best_practices_section}## Common Patterns

You'll see this workflow in many contexts. Variations include:

- **Batch Processing**: Add \`--batch\` for multiple items
- **Dry Run**: Add \`--dry-run\` to preview without executing
- **Verbose Output**: Add \`--verbose\` to see detailed logs

\`\`\`bash
# Example: batch with verbose output
copilot-cli ${feature_id} --execute --batch --verbose
\`\`\`

${extensions_section}## Debugging and Troubleshooting

If something isn't working:

\`\`\`bash
# Enable detailed debugging
copilot-cli ${feature_id} --debug

# Check for common configuration issues
copilot-cli ${feature_id} --validate-config

# Get help specific to your error
copilot-cli ${feature_id} --help-error <error-code>
\`\`\`

---

## Your Progress

You now understand:

- ✅ The workflow and why each step matters
- ✅ How to execute the workflow confidently
- ✅ Best practices for reliable results
- ✅ How to troubleshoot issues

## Next Steps

### 🚀 Level Up

Ready for advanced techniques? 

- **Next Course:** [${feature.name} - Advanced Patterns](/courses/${track}/${feature_id}-advanced) (Advanced)
- **Design Decisions:** Learn how to architect solutions around ${feature.name}

### 💼 Apply Your Skills

- Use this workflow in a real project
- Adapt it to your team's needs
- Document your customizations

### 📚 Deepen Your Knowledge

- [Advanced ${feature.name} Patterns](/courses/${track}/${feature_id}-advanced)
- [Related Feature: Context Management](/courses/${track}/context-intermediate)
- [Architecture Deep Dive](/courses/${track}/architecture-advanced)

---

## Community & Support

- 💬 [GitHub Discussions](https://github.com/copilot/discussions)
- 📖 [Full ${feature.name} Documentation](${feature.documentation_url || '#'})
- 🆘 [Troubleshooting Guide](${feature.troubleshooting_url || '#'})
`;
}

/**
 * Generate advanced-level course template
 * 
 * Pedagogical approach: Open-ended problems, design decisions, production considerations
 * Target: Users building systems with the feature
 * Structure: Problem → Design → Implementation → Production → Capstone
 * 
 * @param {object} feature - Feature object
 * @param {object} opts - Override options
 * @returns {string} MDX course content
 */
export function generateAdvancedTemplate(feature, opts = {}) {
  const {
    title = `${feature.name} - Architecture & Mastery`,
    description = `Build production systems using ${feature.name}`,
    track = feature.track || 'copilot-cli',
    feature_id = feature.id,
    prerequisites = [`${feature_id}-intermediate`],
    estimated_time = '45 min',
    problem_statement = feature.problem_statement || `Design and implement a production-grade solution using ${feature.name}`,
    design_considerations = feature.design_considerations || [],
    production_concerns = feature.production_concerns || [],
    capstone_project = feature.capstone_project || {}
  } = opts;

  const frontmatter = generateFrontmatter({
    title,
    description,
    difficulty: 'advanced',
    track,
    feature_id,
    prerequisites,
    estimated_time
  });

  const prerequisites_section = prerequisites.length > 0
    ? `## Prerequisites

This course is for experienced practitioners. You should be comfortable with:

${prerequisites.map(p => `- [${p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}](/courses/${track}/${p})`).join('\n')}

If you're not there yet, the intermediate course is a good prerequisite.

`
    : '';

  const design_section = design_considerations.length > 0
    ? `## Design Considerations

When architecting with ${feature.name}, consider:

${design_considerations.map((consideration, i) => {
      const name = typeof consideration === 'string' ? consideration : consideration.name;
      const tradeoffs = typeof consideration === 'string' ? '' : consideration.tradeoffs;
      const recommendation = typeof consideration === 'string' ? '' : consideration.recommendation;
      return `### ${i + 1}. ${name}

${tradeoffs ? `**Trade-offs:** ${tradeoffs}` : ''}

${recommendation ? `**Recommendation:** ${recommendation}` : ''}`;
    }).join('\n\n')}

`
    : '';

  const production_section = production_concerns.length > 0
    ? `## Production Considerations

Before deploying to production:

${production_concerns.map((concern, i) => {
      const area = typeof concern === 'string' ? concern : concern.area;
      const details = typeof concern === 'string' ? '' : concern.details;
      const implementation = typeof concern === 'string' ? '' : concern.implementation;
      return `### ${area}

${details || ''}

\`\`\`bash
# Implementation example
${implementation || `copilot-cli ${feature_id} --production`}
\`\`\``;
    }).join('\n\n')}

`
    : '';

  const capstone_section = capstone_project && capstone_project.name
    ? `## Capstone Project: ${capstone_project.name}

${capstone_project.description || 'Design and implement a complete system using what you\'ve learned.'}

### Project Requirements

- ${capstone_project.requirements ? capstone_project.requirements.join('\n- ') : 'Create a working solution'}

### Success Criteria

Your solution should demonstrate:

- ${capstone_project.success_criteria ? capstone_project.success_criteria.join('\n- ') : 'Proper architecture and best practices'}

### Suggested Architecture

\`\`\`
${capstone_project.architecture || 'Design your architecture here'}
\`\`\`

### Evaluation

${capstone_project.evaluation || 'Test your solution against the requirements above.'}

`
    : '';

  return `${frontmatter}

# ${title}

${description}

⏱️ **Time to complete:** ${estimated_time}

---

${prerequisites_section}## The Challenge

${problem_statement}

This course won't give you step-by-step instructions. Instead, we'll discuss architectural decisions, trade-offs, and production concerns that you'll need to consider when building real systems.

## Core Architecture Patterns

### Pattern 1: The Classical Approach

The traditional way to use ${feature.name}:

\`\`\`bash
copilot-cli ${feature_id} \\
  --input <source> \\
  --process <strategy> \\
  --output <destination>
\`\`\`

**When to use:**
- Straightforward, one-off operations
- Small to medium datasets
- Prototyping and learning

**Limitations:**
- Limited scalability
- No built-in retry logic
- Synchronous only

### Pattern 2: The Streaming Approach

For large-scale operations:

\`\`\`bash
copilot-cli ${feature_id} \\
  --stream \\
  --batch-size 100 \\
  --parallel 4 \\
  --checkpoints enabled
\`\`\`

**When to use:**
- Large-scale processing
- Long-running operations
- Resource-constrained environments

**Trade-offs:**
- More complex error handling
- Requires checkpointing
- Higher memory footprint initially

${design_section}## Decision Trees

### When Should You Use This Feature?

\`\`\`
Does your use case involve [core requirement]?
├─ YES
│  ├─ Is scale small (<1000 items)?
│  │  └─ Use Pattern 1: Classical
│  └─ Is scale large (>1000 items)?
│     └─ Use Pattern 2: Streaming
└─ NO
   └─ Consider alternative approaches
\`\`\`

### Choosing Configuration Options

Different deployment scenarios have different optimal configurations:

- **Development**: \`--verbose --validate-all --dry-run\`
- **Testing**: \`--validate-config --error-trace\`
- **Staging**: \`--checkpoints enabled --profile\`
- **Production**: \`--optimize --error-handling strict\`

${production_section}## Performance Optimization

Monitor and tune these aspects:

### Metrics to Track

\`\`\`bash
# Enable profiling
copilot-cli ${feature_id} \\
  --profile \\
  --metrics json \\
  --export-metrics metrics.json
\`\`\`

### Optimization Techniques

1. **Connection Pooling**: Reuse connections across requests
2. **Batch Processing**: Group similar operations
3. **Caching**: Store intermediate results
4. **Parallelization**: Process independent items concurrently

${capstone_section}## Integration Patterns

### Pattern A: Event-Driven

\`\`\`bash
# Trigger on events
copilot-cli ${feature_id} --watch \\
  --on-event-type <type> \\
  --execute-action <action>
\`\`\`

### Pattern B: Pipeline

\`\`\`bash
# Chain operations
copilot-cli ${feature_id} \\
  | copilot-cli transform \\
  | copilot-cli validate \\
  | copilot-cli deliver
\`\`\`

### Pattern C: Microservices

Deploy as a containerized service with proper service discovery, health checks, and monitoring.

---

## Lessons from the Field

- **Lesson 1**: Don't over-engineer. Start simple, optimize when needed.
- **Lesson 2**: Invest in observability early. You'll need good logging and metrics.
- **Lesson 3**: Plan for failure. Every system fails; design for graceful degradation.
- **Lesson 4**: Document your decisions. Future you will appreciate it.

## Mastery Checklist

You've achieved mastery when you can:

- ✅ Architect systems using ${feature.name} that scale to your needs
- ✅ Make informed trade-off decisions
- ✅ Troubleshoot complex production issues
- ✅ Mentor others on best practices

## Further Reading

- [Research: Distributed Patterns](${feature.research_url || '#'})
- [Advanced Configuration Options](${feature.config_url || '#'})
- [Performance Benchmarks](${feature.benchmarks_url || '#'})
- [Community Case Studies](${feature.case_studies_url || '#'})

## Related Advanced Courses

- [Multi-Agent Orchestration](/courses/${track}/multi-agent-advanced)
- [Custom Extensions](/courses/${track}/extensions-advanced)
- [System Architecture](/courses/${track}/architecture-advanced)

---

## Getting Help

You're now at the frontier. If you need help:

- 📖 [Advanced Documentation](${feature.documentation_url || '#'})
- 💬 [Community Forum](https://github.com/copilot/discussions)
- 🔬 [Research & Papers](${feature.research_url || '#'})
- 🤝 [Contributors](https://github.com/copilot/contributors)
`;
}

/**
 * Generate course template for any difficulty level
 * 
 * @param {string} level - Difficulty level: 'beginner', 'intermediate', or 'advanced'
 * @param {object} feature - Feature object
 * @param {object} opts - Override options
 * @returns {string} MDX course content
 */
export function generateCourseTemplate(level, feature, opts = {}) {
  switch (level) {
    case 'beginner':
      return generateBeginnerTemplate(feature, opts);
    case 'intermediate':
      return generateIntermediateTemplate(feature, opts);
    case 'advanced':
      return generateAdvancedTemplate(feature, opts);
    default:
      throw new Error(`Unknown difficulty level: ${level}`);
  }
}
