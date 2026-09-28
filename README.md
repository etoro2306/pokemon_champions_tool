# Champions Lab · Pokémon Champions toolkit

Aplicación web para preparar combates de **Pokémon Champions** con la **regulación vigente** (actualmente **Reg. M-C**: 231 especies y 82 Megaevoluciones).

| Pestaña | Qué hace |
| --- | --- |
| **Comparador** | Explora todos los Pokémon legales, filtra por tipo, ordena por cualquier stat y compara hasta 6 a la vez (radar, barras y stats reales a nivel 50). |
| **Velocidad** | Speed Calculator con orden de turno completo: prioridad, Espacio Raro, Viento Afín, Pantano, climas, campos, habilidades (Nado Rápido, Clorofila, Liviano, Bromista, Alas Vendaval, Primer Auxilio…), objetos (Pañuelo Elección, Bola Férrea, Garra Rápida…), etapas −6…+6 y parálisis. Incluye duelo directo, SP mínimos para superar a un rival, matriz de escenarios y tabla de *speed tiers* de toda la regulación. |
| **Daño** | Damage Calculator con las mecánicas de Champions: rango de daño, las 16 tiradas, probabilidades de OHKO/2HKO/3HKO, ataques en área (×0,75 en dobles), críticos, multigolpe, pantallas, Refuerzo, climas, campos, auras, habilidades Debacle, trampas de entrada y ambos sentidos del enfrentamiento. |
| **Guía** | Guía interactiva con tour guiado, ejemplos que se cargan en las calculadoras con un clic, laboratorio de la fórmula de stats, mini-juego «¿quién es más rápido?», glosario y FAQ. |

## Mecánicas de Pokémon Champions implementadas

- Nivel 50 fijo, IV 31 en todo, **Stat Points (SP)**: 0-32 por stat, 66 en total, 1 SP = +1 al stat.
  - `PS = Base + 75 + SP` · `Resto = ⌊(Base + 20 + SP) × naturaleza⌋`
- Velocidad: etapas → modificadores encadenados en base 4096 (como el juego) → parálisis ×0,5 → tope 10000. Espacio Raro sin desbordamiento (Champions lo eliminó).
- Daño: motor de [`@smogon/calc`](https://github.com/smogon/damage-calc) en su modo Champions (el mismo que usa Pokémon Showdown). Las probabilidades de KO se calculan combinando la distribución exacta de tiradas.
- Sin Teracristalización; objetos limitados a los disponibles en Champions.

## Trigger de cambio de regulación

La lista de Pokémon legales y sus stats se genera desde el código abierto de [Pokémon Showdown](https://github.com/smogon/pokemon-showdown) (mod `champions`, que siempre apunta a la regulación vigente). Hay tres niveles de actualización:

1. **GitHub Actions** (`.github/workflows/update-regulation.yml`)
   - Se ejecuta **cada día**, **a mano** (Actions → *Actualizar regulación* → *Run workflow*, con opción `force`) o **en remoto**:
     ```bash
     curl -X POST -H "Authorization: Bearer <TOKEN>" \
       https://api.github.com/repos/etoro2306/pokemon_champions_tool/dispatches \
       -d '{"event_type":"regulation-changed"}'
     ```
   - Si detecta cambios, regenera `src/data/regulation.json`, actualiza `@smogon/calc`, pasa typecheck + tests + build, hace commit y **redespliega** la web.
2. **Aviso en la web**: al abrirla se comprueba (como mucho cada 6 h) si la regulación ha cambiado; el indicador de la cabecera se ilumina y aparece un banner.
3. **Actualización desde el navegador**: el panel *Regulación* descarga y aplica la nueva lista al instante (se guarda en `localStorage` hasta el siguiente despliegue).

Localmente:

```bash
npm run update:regulation            # regenera si hay cambios
npm run update:regulation -- --check # solo comprueba (código de salida 2 si hay cambios)
npm run update:regulation -- --force # regenera siempre
```

El parser de los ficheros de Showdown (`src/data/literalParser.ts`) interpreta los literales de datos **sin ejecutar código remoto**.

## Desarrollo

Requisitos: Node 20+ (se recomienda 22, ver `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests de los motores (stats, velocidad, daño, parser)
npm run build      # build de producción en dist/
```

## Despliegue

`.github/workflows/deploy.yml` publica la web en **GitHub Pages** en cada push a `main`. Para activarlo: *Settings → Pages → Source: GitHub Actions*. La build es estática (`base: './'`), así que también funciona en Netlify, Vercel o cualquier hosting estático.

## Estructura

```
scripts/update-regulation.ts      CLI del trigger de regulación
src/data/showdownSource.ts        detección del formato vigente y construcción del dataset
src/data/literalParser.ts         parser seguro de los datos de Showdown
src/data/regulation.json          dataset generado (especies, stats, habilidades, learnsets)
src/lib/stats.ts                  fórmula de stats de Champions y naturalezas
src/lib/speed.ts                  motor de velocidad y orden de turno
src/lib/damage.ts                 envoltorio de @smogon/calc + probabilidades de KO
src/features/{compare,speed,damage,guide,regulation}/   pestañas de la web
```

## Créditos

Datos: Pokémon Showdown (MIT) y @smogon/calc (MIT). Sprites servidos por play.pokemonshowdown.com.
Pokémon y sus nombres son marcas de Nintendo, Creatures Inc. y GAME FREAK inc. Proyecto de fans sin afiliación oficial.
