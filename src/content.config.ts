import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const broadcaster = z.object({
  name: z.string(),
  country: z.string(),
  lang: z.string().default('FR'),
  url: z.string().url(),
  note: z.string().optional(),
});

const paidBroadcaster = z.object({
  name: z.string(),
  price: z.string(),
  url: z.string().url().optional(),
  note: z.string().optional(),
});

const matches = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/matches' }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().optional(),
    description: z.string(),
    sport: z.enum(['football', 'formule-1', 'ufc', 'motogp', 'tennis', 'rugby', 'cyclisme', 'sports-hiver', 'combat']),
    competition: z.string(),
    homeTeam: z.string().optional(),
    awayTeam: z.string().optional(),
    venue: z.string().optional(),
    homeTeamLogo: z.string().url().optional(),
    awayTeamLogo: z.string().url().optional(),
    eventPoster: z.string().url().optional(),
    eventDate: z.coerce.date(),
    status: z.enum(['upcoming', 'live', 'finished']).default('upcoming'),
    score: z.string().optional(),
    freeBroadcasters: z.array(broadcaster).min(1),
    paidBroadcasters: z.array(paidBroadcaster).default([]),
    vpnServer: z.string().default('Belgique'),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['chaines-etrangeres', 'svod-cinema', 'economies', 'tutoriels-vpn']),
    publishDate: z.string(),
    updatedDate: z.string(),
    vpnRequired: z.boolean().default(true),
    vpnCountry: z.string().optional(),
    featuredImage: z.string().optional(),
    steps: z.array(z.object({ name: z.string(), text: z.string() })).default([]),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    schemaType: z.enum(['HowTo', 'Article']).default('HowTo'),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.string(),
    sourceUrl: z.string().url().optional(),
    sourceName: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { matches, guides, news };
