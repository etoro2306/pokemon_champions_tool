/**
 * Regenera src/data/regulation.json con la regulación vigente de Pokémon Champions.
 *
 *   npm run update:regulation            → descarga y escribe (si hay cambios)
 *   npm run update:regulation -- --check → solo informa; sale con código 2 si hay cambios
 *
 * Lo ejecuta automáticamente .github/workflows/update-regulation.yml (cron diario y
 * disparo manual/remoto), que además hace commit y vuelve a desplegar la web.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildRegulation, checkRemoteRegulation } from '../src/data/showdownSource.ts';
import type { RegulationData } from '../src/data/types.ts';

const OUT = fileURLToPath(new URL('../src/data/regulation.json', import.meta.url));
const checkOnly = process.argv.includes('--check');
const force = process.argv.includes('--force');

async function readCurrent(): Promise<RegulationData | null> {
  try {
    return JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    return null;
  }
}

function setOutput(key: string, value: string) {
  const file = process.env.GITHUB_OUTPUT;
  if (file) return writeFile(file, `${key}=${value}\n`, { flag: 'a' });
}

async function main() {
  const current = await readCurrent();
  const remote = await checkRemoteRegulation();
  const changed = force || !current || current.meta.fingerprint !== remote.fingerprint;

  console.log(`Formato vigente en Showdown: ${remote.format.name} (${remote.legalCount} entradas legales)`);
  console.log(`Dataset local: ${current ? `${current.meta.formatName} · huella ${current.meta.fingerprint}` : 'no existe'}`);
  await setOutput('regulation', remote.format.regulation);
  await setOutput('changed', String(changed));

  if (!changed) {
    console.log('✔ Sin cambios: la regulación local está al día.');
    return;
  }
  if (checkOnly) {
    console.log('⚠ Hay cambios en la regulación. Ejecuta `npm run update:regulation` para aplicarlos.');
    process.exitCode = 2;
    return;
  }

  const data = await buildRegulation(undefined, (m) => console.log(`… ${m}`));
  await writeFile(OUT, JSON.stringify(data) + '\n');

  const before = new Set(current?.species.map((s) => s.id) ?? []);
  const after = new Set(data.species.map((s) => s.id));
  const added = [...after].filter((id) => !before.has(id));
  const removed = [...before].filter((id) => !after.has(id));
  console.log(`✔ Escrito ${OUT}`);
  console.log(`  Regulación ${data.meta.regulation}: ${data.meta.speciesCount} especies, ${data.meta.megaCount} Megas, ${data.meta.totalEntries} entradas.`);
  if (current) {
    console.log(`  Añadidos (${added.length}): ${added.join(', ') || '—'}`);
    console.log(`  Retirados (${removed.length}): ${removed.join(', ') || '—'}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
