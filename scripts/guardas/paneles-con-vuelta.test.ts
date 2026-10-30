import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PENDIENTES } from './paneles-con-vuelta'

// Un panel que suma al historial y no marca la vuelta deja el foco en `body` tras recargar y pulsar «atrás» (4-49). Esta prueba lista cada
// `history: 'push'` de `src/` y exige que su archivo importe `abrirConVuelta`, que sea `usePanelPorUrl()` (que la usa) o que figure en `PENDIENTES`.

const RAIZ = process.cwd()
const PROPIO = 'src/shared/ui/use-panel-por-url.ts'
const IMPORTA_LA_VUELTA =
  /import\s*\{[^}]*\babrirConVuelta\b[^}]*\}\s*from\s*'@\/shared\/ui\/vuelta-del-foco'/

function* archivos(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name)
    if (e.isDirectory()) {
      yield* archivos(ruta)
    } else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) {
      yield ruta
    }
  }
}

const aRelativa = (ruta: string) => relative(RAIZ, ruta).replaceAll('\\', '/')
const leer = (archivo: string) => readFileSync(join(RAIZ, archivo), 'utf8')
const importaLaVuelta = (archivo: string) => IMPORTA_LA_VUELTA.test(leer(archivo))

describe('los paneles que suman al historial marcan la vuelta del foco', () => {
  const conPush = [...archivos(join(RAIZ, 'src'))]
    .map(aRelativa)
    .filter((archivo) => archivo !== PROPIO && leer(archivo).includes("history: 'push'"))
    .sort()

  it('cada history: «push» de src/ importa abrirConVuelta o es un pendiente', () => {
    const sinVuelta = conPush.filter(
      (archivo) => !importaLaVuelta(archivo) && !(archivo in PENDIENTES),
    )
    expect(sinVuelta).toEqual([])
  })

  it('la lista de pendientes sólo se achica: ninguno ya la importa y todos existen', () => {
    for (const archivo of Object.keys(PENDIENTES)) {
      expect(existsSync(join(RAIZ, archivo)), `${archivo} no existe`).toBe(true)
      expect(
        importaLaVuelta(archivo),
        `${archivo} ya importa abrirConVuelta: sácalo de PENDIENTES`,
      ).toBe(false)
    }
  })
})
