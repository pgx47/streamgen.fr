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
    sport: z.enum(['football', 'formule-1', 'ufc', 'motogp']),
    competition: z.string(),
    homeTeam: z.string().optional(),
    awayTeam: z.string().optional(),
    venue: z.string().optional(),
    eventDate: z.coerce.date(),
    status: z.enum(['upcoming', 'live', 'finished']).default('upcoming'),
    score: z.string().optional(),
    freeBroadcasters: z.array(broadcaster).min(1),
    paidBroadcasters: z.array(paidBroadcaster).default([]),
    vpnServer: z.string().default('Belgique'),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

export const collections = { matches };
