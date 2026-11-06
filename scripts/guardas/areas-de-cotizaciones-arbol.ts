import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

import { MODULO, type Archivo } from './areas-de-cotizaciones'

// El árbol de verdad de `src/modules/cotizaciones/`, que leen las pruebas de la partición por áreas
// (`areas-de-cotizaciones.test.ts` y `areas-de-cotizaciones-plan.test.ts`).
export const RAIZ = process.cwd()

function* archivosDe(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name)
    if (e.isDirectory()) yield* archivosDe(ruta)
    else yield relative(RAIZ, ruta).replaceAll('\\', '/')
  }
}

export const archivosDelModulo = (): Archivo[] =>
  [...archivosDe(join(RAIZ, MODULO))].map((ruta) => ({
    ruta,
    texto: /\.tsx?$/.test(ruta) ? readFileSync(join(RAIZ, ruta), 'utf8') : '',
  }))
