import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  AREAS_DE_REPUESTOS,
  ENTRADAS,
  MODULO,
  problemasDeAreasDeRepuestos,
  type Archivo,
} from './areas-de-repuestos'

// La partición de `repuestos` por área (8.08-2): un área no importa otra, el núcleo no importa ningún área, las entradas de la raíz sólo
// reexportan y cada área tiene sus lugares. Si cae: lo nuevo de un paso va en las carpetas de SU área; lo compartido, al núcleo.
const TODAS = ['nucleo', ...AREAS_DE_REPUESTOS]
const f = (rel: string, texto = ''): Archivo => ({ ruta: `${MODULO}${rel}`, texto })

function arbol(): Archivo[] {
  const a: Archivo[] = ENTRADAS.map((e) =>
    f(`${e}.ts`, TODAS.map((x) => `export * from './areas/${x}/${e}'`).join('\n')),
  )
  for (const x of TODAS) {
    a.push(f(`areas/${x}/index.ts`), f(`areas/${x}/client.ts`))
    a.push(f(`areas/${x}/composicion.ts`, "// La composición.\nimport 'server-only'\n"))
  }
  for (const x of AREAS_DE_REPUESTOS) {
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

describe('áreas de repuestos', () => {
  it('el árbol de prueba cumple', () => {
    expect(problemasDeAreasDeRepuestos(arbol())).toEqual([])
  })

  it.each([
    ["import { f } from '../../../entities/compras/f'"],
    ["import type { F } from '@/modules/repuestos/entities/compras/f'"],
    ["export { f } from '../../../areas/compras/index'"],
    ["const F = diferido(() => import('../../../features/compras/components/f'))"],
  ])('un área que importa otra cae: %s', (linea) => {
    expect(problemasDeAreasDeRepuestos(con(f('features/items/hooks/x.ts', `${linea}\n`)))).toEqual([
      expect.stringMatching(/el área items importa .*de el área compras/),
    ])
  })

  it('un área que importa lo suyo, el núcleo y otros módulos pasa', () => {
    const texto = [
      "import { a } from '../../../entities/items/a'",
      "import { unidad } from '../../../entities/nucleo/unidad'",
      "import { z } from 'zod'",
      "// import { x } from '../../../entities/compras/x'",
    ].join('\n')
    expect(problemasDeAreasDeRepuestos(con(f('features/items/hooks/x.ts', texto)))).toEqual([])
  })

  it('el núcleo que importa un área cae', () => {
    const p = problemasDeAreasDeRepuestos(
      con(
        f('entities/nucleo/unidad.ts', "import { a } from '../items/a'\nexport const unidad = a\n"),
      ),
    )
    expect(p).toEqual([expect.stringContaining('el núcleo importa «../items/a», de el área items')])
  })

  it('importar la raíz desde adentro cae', () => {
    const p = problemasDeAreasDeRepuestos(
      con(f('features/items/x.ts', "import { a } from '../..'\n")),
    )
    expect(p).toEqual([expect.stringContaining('de la raíz')])
  })

  it('una entrada de la raíz con algo que no es export * cae', () => {
    const p = problemasDeAreasDeRepuestos(con(f('index.ts', "export { a } from './composicion'\n")))
    expect(p).toEqual([expect.stringContaining('index.ts: sólo lleva')])
  })

  it('falta una entrada de un área, su pantalla, su lugar o el server-only', () => {
    expect(problemasDeAreasDeRepuestos(sin('areas/stock/client.ts'))).toEqual([
      expect.stringContaining('areas/stock/client.ts: falta'),
    ])
    expect(problemasDeAreasDeRepuestos(sin('pantallas/flujo.ts'))).toEqual([
      expect.stringContaining('pantallas/flujo.ts: falta'),
    ])
    expect(problemasDeAreasDeRepuestos(sin('infra/compras/.gitkeep'))).toEqual([
      expect.stringContaining('infra/compras/: falta el lugar'),
    ])
    expect(
      problemasDeAreasDeRepuestos(con(f('areas/compras/composicion.ts', 'export {}\n'))),
    ).toEqual([expect.stringContaining('server-only')])
  })

  it('una carpeta sin dueño cae', () => {
    expect(problemasDeAreasDeRepuestos(con(f('features/nueva/x.ts', 'export {}\n')))).toEqual([
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

describe('áreas de repuestos › el módulo de verdad', () => {
  it('cumple la partición', () => {
    const archivos = [...archivosDe(join(process.cwd(), MODULO))].map((ruta) => ({
      ruta,
      texto: /\.tsx?$/.test(ruta) ? readFileSync(join(process.cwd(), ruta), 'utf8') : '',
    }))
    expect(problemasDeAreasDeRepuestos(archivos)).toEqual([])
  })
})
