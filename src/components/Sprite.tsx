import { useEffect, useMemo, useState } from 'react';
import type { SpeciesEntry } from '../data/types';
import { toID } from '../lib/util';

const PS = 'https://play.pokemonshowdown.com/sprites';

export function spriteId(sp: Pick<SpeciesEntry, 'baseSpecies' | 'forme'>) {
  const base = toID(sp.baseSpecies);
  return sp.forme ? `${base}-${toID(sp.forme)}` : base;
}

export function spriteCandidates(sp: Pick<SpeciesEntry, 'baseSpecies' | 'forme'>): string[] {
  const id = spriteId(sp);
  const base = toID(sp.baseSpecies);
  const list = [`${PS}/home-centered/${id}.png`, `${PS}/gen5/${id}.png`, `${PS}/dex/${id}.png`];
  if (id !== base) list.push(`${PS}/home-centered/${base}.png`, `${PS}/gen5/${base}.png`);
  return list;
}

export function Sprite({ species, size = 48, className }: { species?: SpeciesEntry | null; size?: number; className?: string }) {
  const urls = useMemo(() => (species ? spriteCandidates(species) : []), [species]);
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [species?.id]);

  if (!species || idx >= urls.length) {
    return (
      <div className={`sprite-fallback ${className ?? ''}`} style={{ width: size, height: size }}>
        {species ? species.name.slice(0, 2).toUpperCase() : '?'}
      </div>
    );
  }
  return (
    <img
      className={`sprite ${className ?? ''}`}
      src={urls[idx]}
      alt={species.name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setIdx((i) => i + 1)}
    />
  );
}
