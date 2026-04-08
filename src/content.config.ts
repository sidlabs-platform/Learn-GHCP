import { defineCollection, z } from 'astro:content';

const coursesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    track: z.enum([
      'copilot-cli',
      'agents',
      'mcp',
      'skills',
      'plugins',
      'industry',
      'persona',
      'technology',
    ]),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    featureRefs: z.array(z.string()).optional(),
    personaTags: z.array(z.string()).optional(),
    technologyTags: z.array(z.string()).optional(),
    industryTags: z.array(z.string()).optional(),
    prerequisites: z.array(z.string()).optional(),
    estimatedMinutes: z.number(),
    qualityScore: z.number().optional(),
    lastGenerated: z.date().transform((val) => new Date(val)),
    lastVerified: z.date().transform((val) => new Date(val)).optional(),
    published: z.boolean().default(true),
  }),
});

export const collections = {
  courses: coursesCollection,
};
