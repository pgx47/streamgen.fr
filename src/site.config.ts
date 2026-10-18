export const SITE = {
  name: 'StreamGen',
  url: 'https://streamgen.fr',
  domain: 'streamgen.fr',
  tagline: 'Le comparateur de retransmission sportive légale',
  description:
    'Sur quelle chaîne regarder le sport en streaming ? StreamGen compare les diffuseurs officiels — chaînes payantes françaises vs chaînes publiques étrangères en clair — et vous explique comment y accéder légalement avec un VPN.',
  vpnUrl:
    import.meta.env.PUBLIC_VPN_AFFILIATE_URL ??
    'https://nordvpn.com/fr/',
  analyticsId: import.meta.env.PUBLIC_GA_ID ?? '',
  disclaimer:
    "StreamGen.fr est un service d'information indépendant. Nous ne diffusons, n'hébergeons et ne relayons aucun flux streaming illégal ou piraté. Nous répertorions exclusivement les chaînes de télévision officielles détentrices des droits de retransmission dans leurs pays respectifs.",
} as const;

export const SPORTS = [
  { slug: 'football', label: 'Football', icon: '⚽' },
  { slug: 'formule-1', label: 'Formule 1', icon: '🏎️' },
  { slug: 'ufc', label: 'UFC / MMA', icon: '🥊' },
  { slug: 'motogp', label: 'MotoGP', icon: '🏍️' },
  { slug: 'tennis', label: 'Tennis', icon: '🎾' },
  { slug: 'rugby', label: 'Rugby', icon: '🏉' },
] as const;
