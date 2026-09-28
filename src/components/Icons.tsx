import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...p,
});

export const IconBolt = (p: P) => (<svg {...base(p)}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" /></svg>);
export const IconSword = (p: P) => (<svg {...base(p)}><path d="M14.5 17.5 3 6V3h3l11.5 11.5" /><path d="m13 19 6-6" /><path d="m16 16 4 4" /><path d="m19 21 2-2" /></svg>);
export const IconBars = (p: P) => (<svg {...base(p)}><path d="M3 3v18h18" /><path d="M7 16v-5" /><path d="M11 16V8" /><path d="M15 16v-3" /><path d="M19 16V6" /></svg>);
export const IconBook = (p: P) => (<svg {...base(p)}><path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5" /><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19" /><path d="M9 7h6" /></svg>);
export const IconSun = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>);
export const IconMoon = (p: P) => (<svg {...base(p)}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>);
export const IconRain = (p: P) => (<svg {...base(p)}><path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3" /><path d="M8 19v2M8 13v2M16 19v2M16 13v2M12 21v2M12 15v2" /></svg>);
export const IconSand = (p: P) => (<svg {...base(p)}><path d="M3 8h11a3 3 0 1 0-3-3" /><path d="M3 12h16a3 3 0 1 1-3 3" /><path d="M3 16h7" /></svg>);
export const IconSnow = (p: P) => (<svg {...base(p)}><path d="M12 2v20M4.9 7l14.2 10M4.9 17 19.1 7" /><path d="m9 4 3 2 3-2M9 20l3-2 3 2" /></svg>);
export const IconWind = (p: P) => (<svg {...base(p)}><path d="M17.7 7.7A2.5 2.5 0 1 1 19.5 12H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" /></svg>);
export const IconSwap = (p: P) => (<svg {...base(p)}><path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" /></svg>);
export const IconPlus = (p: P) => (<svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>);
export const IconX = (p: P) => (<svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>);
export const IconSearch = (p: P) => (<svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const IconRefresh = (p: P) => (<svg {...base(p)}><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" /><path d="M21 3v5h-5" /></svg>);
export const IconShield = (p: P) => (<svg {...base(p)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>);
export const IconCheck = (p: P) => (<svg {...base(p)}><path d="M20 6 9 17l-5-5" /></svg>);
export const IconInfo = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>);
export const IconAlert = (p: P) => (<svg {...base(p)}><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z" /><path d="M12 9v4M12 17h.01" /></svg>);
export const IconSparkle = (p: P) => (<svg {...base(p)}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z" /></svg>);
export const IconTrophy = (p: P) => (<svg {...base(p)}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></svg>);
export const IconClock = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const IconTarget = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>);
export const IconLayers = (p: P) => (<svg {...base(p)}><path d="m12 2 10 5-10 5L2 7z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></svg>);
export const IconTrash = (p: P) => (<svg {...base(p)}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>);
export const IconCopy = (p: P) => (<svg {...base(p)}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>);
export const IconChevron = (p: P) => (<svg {...base(p)}><path d="m9 18 6-6-6-6" /></svg>);
export const IconChevronDown = (p: P) => (<svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>);
export const IconPlay = (p: P) => (<svg {...base(p)}><path d="M6 4v16l14-8z" /></svg>);
export const IconCompass = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="10" /><path d="m16 8-2 6-6 2 2-6z" /></svg>);
export const IconExternal = (p: P) => (<svg {...base(p)}><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>);
export const IconFlip = (p: P) => (<svg {...base(p)}><path d="M3 7h13l-3-3M21 17H8l3 3" /></svg>);
export const IconTerrain = (p: P) => (<svg {...base(p)}><path d="m3 20 6-10 4 6 3-4 5 8z" /></svg>);
export const IconDice = (p: P) => (<svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" /><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></svg>);
export const IconGrid = (p: P) => (<svg {...base(p)}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>);
export const IconList = (p: P) => (<svg {...base(p)}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>);
export const IconGithub = (p: P) => (<svg {...base(p)}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.4 6.4-1.5 6.4-6.9A5.4 5.4 0 0 0 20 4.8 5 5 0 0 0 19.9 1S18.7.6 16 2.5a13.4 13.4 0 0 0-7 0C6.3.6 5.1 1 5.1 1A5 5 0 0 0 5 4.8a5.4 5.4 0 0 0-1.5 3.7c0 5.4 3.3 6.5 6.4 6.9a3.4 3.4 0 0 0-.9 2.6V22" /></svg>);
export const IconDownload = (p: P) => (<svg {...base(p)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>);

export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="bm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1d59a" />
          <stop offset="1" stopColor="#b8893e" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="var(--surface-3)" stroke="var(--border-strong)" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="url(#bm-g)" strokeWidth="4" />
      <path d="M14 32h12m12 0h12" stroke="url(#bm-g)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="6" fill="url(#bm-g)" />
    </svg>
  );
}
