import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://sidlabs-platform.github.io',
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
