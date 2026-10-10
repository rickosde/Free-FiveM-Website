// Al indhold der sandsynligvis skal ændres, samlet ét sted.
// Ret her — ingen grund til at rode i komponenterne for tekst/links.

export const siteConfig = {
  serverName: 'Projekt',
  tagline: '',
  description:
    '',
  // FiveM connect — cfx.re join-kode, f.eks. "abc123" fra cfx.re/join/abc123
  cfxCode: 'REPLACE_ME',
  connectUrl: '',

  discordUrl: '',

  socials: {
    discord: '',
    tiktok: '',
    youtube: '',
  },

  nav: [
    { label: 'Om serveren', href: '#om' },
    { label: 'Features', href: '#features' },
    { label: 'Galleri', href: '#galleri' },
    { label: 'Staff', href: '/staff' },
    { label: 'Ansøgning', href: '/ansogning' },
    { label: 'Regler', href: '#regler' },
  ],

  stats: [
    { value: '64', label: 'Slots i byen' },
    { value: '20+', label: 'Custom jobs & scripts' },
    { value: '24/7', label: 'Aktiv drift' },
  ],

  features: [
    {
      code: 'ØKONOMI',
      title: 'Egen økonomi',
      body: 'Et pengesystem bygget fra bunden — inflation, sortbørs og en fast job-markedspris der reagerer på hvad byen gør.',
    },
    {
      code: 'JOB',
      title: 'Custom jobs',
      body: 'Fra mekaniker til advokat. Ingen kopierede scripts — hvert erhverv er bygget til Projekt og til hinanden.',
    },
    {
      code: 'LOVEN',
      title: 'Retssystem',
      body: 'Politi, retsvæsen og fængsel spiller sammen som ét system. Konsekvenser der rent faktisk holder.',
    },
    {
      code: 'BOLIG',
      title: 'Ejendomme',
      body: 'Køb, indret og lås din bolig op med et interiørsystem der giver dig fuld kontrol over rummet.',
    },
  ],

  rules: [
    { title: 'RP > alt', body: 'Rollespil kommer før win, altid. Metagaming og powergaming accepteres ikke.' },
    { title: 'Realistisk tempo', body: 'Din karakter er et menneske. Reager derefter — ingen scener uden konsekvens.' },
    { title: 'Respekt off-server', body: 'Det du oplever i byen bliver i byen. Vær ordentlig i Discord og i chatten.' },
    { title: 'Whitelist-ansøgning', body: 'Vi optager løbende. Ansøgningen tager typisk 2-4 dage at få svar på.' },
  ],

  // Sæt til falsk for at skjule live-status panelet, f.eks. hvis serveren
  // endnu ikke er live.
  showServerStatus: true,
}
