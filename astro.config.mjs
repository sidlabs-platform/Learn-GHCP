import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://yourusername.github.io/Learn-GHCP',
  base: '/Learn-GHCP',
  output: 'static',
  integrations: [
    mdx(),
    sitemap(),
  ],
  markdown: {
    syntaxHighlight: 'shiki',
  },
});
