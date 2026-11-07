import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// `scripts/mapa.sh` lista la API de un módulo aunque su entrada sólo reexporte con `export *` (4.15-4: las entradas de `cotizaciones`
// reexportan cada área, `areas/<área>/index.ts`). Sin seguir el `export *`, el MAPA, lo primero que lee cada sesión, diría
// `* ./areas/nucleo/index` en vez de los nombres. Cuáles son los 10 primeros depende del orden de las áreas: aquí se mira que no quede
// ningún `* ./` y cuántos son (los nombres, uno por uno, los comparó la sonda S1 del 4.15-4). Efecto lateral: escribe `docs/MAPA.md`,
// que no se versiona y sale igual en cada corrida (el script no escribe fechas).

const RAIZ = process.cwd()

function seccionDe(mapa: string, modulo: string): string {
  const desde = mapa.indexOf(`### \`${modulo}\``)
  const hasta = mapa.indexOf('\n### ', desde + 1)
  return mapa.slice(desde, hasta === -1 ? undefined : hasta)
}

describe('mapa.sh › la API de un módulo que reexporta por área', () => {
  it('T13 la de cotizaciones lista sus nombres (al menos 87) y los de cliente, sin `* ./`', () => {
    execFileSync('bash', ['scripts/mapa.sh'], { cwd: RAIZ, stdio: 'pipe' })
    const seccion = seccionDe(readFileSync(join(RAIZ, 'docs/MAPA.md'), 'utf8'), 'cotizaciones')
    const api = seccion.split('\n').find((l) => l.startsWith('- API: '))
    const cliente = seccion.split('\n').find((l) => l.startsWith('- API de cliente'))
    expect(api).toBeDefined()
    expect(api).not.toContain('* ./')
    // Al menos los 87 de cuando se partió por área (diez y «+77»): cada paso que exporta algo suma, y un número exacto hacía caer esta
    // prueba del A con el trabajo de cualquier carril (el 4.18-3a la dejó en 92, 2026-11-06).
    const resto = Number(/, \+(\d+)$/.exec(api ?? '')?.[1] ?? 0)
    expect(resto).toBeGreaterThanOrEqual(77)
    expect(cliente).toContain('`useLectorDeOpciones`')
    expect(cliente).not.toContain('* ./')
  })
})
