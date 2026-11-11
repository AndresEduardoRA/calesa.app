import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  AREAS_DE_LOGISTICA,
  ENTRADAS,
  MODULO,
  problemasDeAreasDeLogistica,
  type Archivo,
} from './areas-de-logistica'

// La partición de `logistica` por área (6.01-1): un área no importa otra, el núcleo no importa ningún área, las entradas de la raíz sólo
// reexportan y cada área tiene sus lugares. Si cae: lo nuevo de un paso va en las carpetas de SU área; lo compartido, al núcleo (lo decide el A).
const TODAS = ['nucleo', ...AREAS_DE_LOGISTICA]
const f = (rel: string, texto = ''): Archivo => ({ ruta: `${MODULO}${rel}`, texto })

function arbol(): Archivo[] {
  const a: Archivo[] = ENTRADAS.map((e) =>
    f(`${e}.ts`, TODAS.map((x) => `export * from './areas/${x}/${e}'`).join('\n')),
  )
  for (const x of TODAS) {
    a.push(f(`areas/${x}/index.ts`), f(`areas/${x}/client.ts`))
    a.push(f(`areas/${x}/composicion.ts`, "// La composición.\nimport 'server-only'\n"))
  }
  for (const x of AREAS_DE_LOGISTICA) {
    a.push(f(`features/${x}/.gitkeep`), f(`entities/${x}/.gitkeep`), f(`infra/${x}/.gitkeep`))
    a.push(f(`pantallas/${x}.ts`, 'export {}\n'))
  }
  a.push(f('entities/nucleo/unidad.ts', 'export const unidad = 1\n'))
  return a
}
const con = (...extra: Archivo[]) => {
  const rutas = new Set(extra.map((x) => x.ruta))
  return [...arbol().filter((x) => !rutas.has(x.ruta)), ...extra]
}
const sin = (rel: string) => arbol().filter((x) => x.ruta !== `${MODULO}${rel}`)

describe('áreas de logistica', () => {
  it('el árbol de prueba cumple', () => {
    expect(problemasDeAreasDeLogistica(arbol())).toEqual([])
  })

  it.each([
    ["import { f } from '../../../entities/aduana/f'"],
    ["import type { F } from '@/modules/logistica/entities/aduana/f'"],
    ["export { f } from '../../../areas/aduana/index'"],
    ["const F = diferido(() => import('../../../features/aduana/components/f'))"],
  ])('un área que importa otra cae: %s', (linea) => {
    expect(problemasDeAreasDeLogistica(con(f('features/cadena/hooks/x.ts', `${linea}\n`)))).toEqual(
      [expect.stringMatching(/el área cadena importa .*de el área aduana/)],
    )
  })

  it('un área que importa lo suyo, el núcleo y otros módulos pasa', () => {
    const texto = [
      "import { a } from '../../../entities/cadena/a'",
      "import { unidad } from '../../../entities/nucleo/unidad'",
      "import { z } from 'zod'",
      "// import { x } from '../../../entities/aduana/x'",
    ].join('\n')
    expect(problemasDeAreasDeLogistica(con(f('features/cadena/hooks/x.ts', texto)))).toEqual([])
  })

  it('el núcleo que importa un área cae', () => {
    const p = problemasDeAreasDeLogistica(
      con(
        f(
          'entities/nucleo/unidad.ts',
          "import { a } from '../cadena/a'\nexport const unidad = a\n",
        ),
      ),
    )
    expect(p).toEqual([
      expect.stringContaining('el núcleo importa «../cadena/a», de el área cadena'),
    ])
  })

  it('importar la raíz desde adentro cae', () => {
    const p = problemasDeAreasDeLogistica(
      con(f('features/cadena/x.ts', "import { a } from '../..'\n")),
    )
    expect(p).toEqual([expect.stringContaining('de la raíz')])
  })

  it('una entrada de la raíz con algo que no es export * cae', () => {
    const p = problemasDeAreasDeLogistica(con(f('index.ts', "export { a } from './composicion'\n")))
    expect(p).toEqual([expect.stringContaining('index.ts: sólo lleva')])
  })

  it('falta una entrada de un área, su pantalla, su lugar o el server-only', () => {
    expect(problemasDeAreasDeLogistica(sin('areas/mover/client.ts'))).toEqual([
      expect.stringContaining('areas/mover/client.ts: falta'),
    ])
    expect(problemasDeAreasDeLogistica(sin('pantallas/alertas.ts'))).toEqual([
      expect.stringContaining('pantallas/alertas.ts: falta'),
    ])
    expect(problemasDeAreasDeLogistica(sin('infra/aduana/.gitkeep'))).toEqual([
      expect.stringContaining('infra/aduana/: falta el lugar'),
    ])
    expect(
      problemasDeAreasDeLogistica(con(f('areas/aduana/composicion.ts', 'export {}\n'))),
    ).toEqual([expect.stringContaining('server-only')])
  })

  it('una carpeta sin dueño cae', () => {
    expect(problemasDeAreasDeLogistica(con(f('features/nueva/x.ts', 'export {}\n')))).toEqual([
      expect.stringContaining('features/nueva/: carpeta que no es de ningún área'),
    ])
  })
})

function* archivosDe(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name)
    if (e.isDirectory()) yield* archivosDe(ruta)
    else yield relative(process.cwd(), ruta).replaceAll('\\', '/')
  }
}

describe('áreas de logistica › el módulo de verdad', () => {
  it('cumple la partición', () => {
    const archivos = [...archivosDe(join(process.cwd(), MODULO))].map((ruta) => ({
      ruta,
      texto: /\.tsx?$/.test(ruta) ? readFileSync(join(process.cwd(), ruta), 'utf8') : '',
    }))
    expect(problemasDeAreasDeLogistica(archivos)).toEqual([])
  })
})
