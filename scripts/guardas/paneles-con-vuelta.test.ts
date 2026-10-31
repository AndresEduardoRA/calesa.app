import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Un panel que suma al historial y no marca la vuelta deja el foco en `body` tras recargar y pulsar «atrás» (4-49). Esta prueba lista cada
// `history: 'push'` de `src/` y exige que su archivo importe de `src/shared/ui/vuelta-del-foco.ts` `abrirConVuelta` (marca la entrada al abrir) y
// `useVueltaDelFoco` (recuerda la ficha mientras está abierto: sin él, la marca existe pero tras recargar nadie la encuentra), salvo `usePanelPorUrl()`,
// que las usa por dentro. Con `noUnusedLocals`, importar `useVueltaDelFoco` obliga a llamarlo. No hay lista de pendientes: se cerró en el 4.14-2a6.

const RAIZ = process.cwd()
const PROPIO = 'src/shared/ui/use-panel-por-url.ts'
const EXIGIDAS = ['abrirConVuelta', 'useVueltaDelFoco'] as const
const IMPORTS_DE_LA_VUELTA = /import\s*\{([^}]*)\}\s*from\s*'@\/shared\/ui\/vuelta-del-foco'/g

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

// Lo que el archivo importa de la vuelta, sumando uno o varios `import`.
const importadas = (texto: string): Set<string> =>
  new Set(
    [...texto.matchAll(IMPORTS_DE_LA_VUELTA)].flatMap((m) =>
      (m[1] ?? '').split(',').map((nombre) => nombre.trim()),
    ),
  )

describe('los paneles que suman al historial marcan la vuelta del foco', () => {
  const conPush = [...archivos(join(RAIZ, 'src'))]
    .map(aRelativa)
    .filter((archivo) => archivo !== PROPIO && leer(archivo).includes("history: 'push'"))
    .sort()

  it('hay paneles que suman al historial (la búsqueda no quedó vacía)', () => {
    expect(conPush.length).toBeGreaterThan(0)
  })

  it('cada history: «push» de src/ importa abrirConVuelta y useVueltaDelFoco', () => {
    const faltan = conPush.flatMap((archivo) => {
      const tiene = importadas(leer(archivo))
      const falta = EXIGIDAS.filter((nombre) => !tiene.has(nombre))
      return falta.length > 0 ? [`${archivo}: falta ${falta.join(' y ')}`] : []
    })
    expect(faltan).toEqual([])
  })
})
