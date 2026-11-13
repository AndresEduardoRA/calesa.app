import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  AREAS_DE_FLUJOS,
  ENTRADAS,
  MODULO,
  problemasDeAreasDeFlujos,
  type Archivo,
} from './areas-de-flujos'

// La partición de `flujos` por área (5.02-1): un área no importa otra, el núcleo no importa ningún área, las entradas de la raíz sólo
// reexportan y cada área tiene sus lugares. Si cae: lo nuevo de un paso va en las carpetas de SU área; lo compartido, al núcleo.
const TODAS = ['nucleo', ...AREAS_DE_FLUJOS]
const f = (rel: string, texto = ''): Archivo => ({ ruta: `${MODULO}${rel}`, texto })

function arbol(): Archivo[] {
  const a: Archivo[] = ENTRADAS.map((e) =>
    f(`${e}.ts`, TODAS.map((x) => `export * from './areas/${x}/${e}'`).join('\n')),
  )
  for (const x of TODAS) {
    a.push(f(`areas/${x}/index.ts`), f(`areas/${x}/client.ts`))
    a.push(f(`areas/${x}/composicion.ts`, "// La composición.\nimport 'server-only'\n"))
  }
  for (const x of AREAS_DE_FLUJOS) {
    a.push(f(`features/${x}/.gitkeep`), f(`entities/${x}/.gitkeep`), f(`infra/${x}/.gitkeep`))
    a.push(f(`pantallas/${x}.ts`, 'export {}\n'))
  }
  a.push(f('entities/flujo.ts', 'export const flujo = 1\n'))
  return a
}
const con = (...extra: Archivo[]) => {
  const rutas = new Set(extra.map((x) => x.ruta))
  return [...arbol().filter((x) => !rutas.has(x.ruta)), ...extra]
}
const sin = (rel: string) => arbol().filter((x) => x.ruta !== `${MODULO}${rel}`)

describe('áreas de flujos', () => {
  it('el árbol de prueba cumple', () => {
    expect(problemasDeAreasDeFlujos(arbol())).toEqual([])
  })

  it.each([
    ["import { f } from '../../../entities/reglas/f'"],
    ["import type { F } from '@/modules/flujos/entities/reglas/f'"],
    ["export { f } from '../../../areas/reglas/index'"],
    ["const F = diferido(() => import('../../../features/reglas/components/f'))"],
  ])('un área que importa otra cae: %s', (linea) => {
    expect(problemasDeAreasDeFlujos(con(f('features/fases/hooks/x.ts', `${linea}\n`)))).toEqual([
      expect.stringMatching(/el área fases importa .*de el área reglas/),
    ])
  })

  it('un área que importa lo suyo, el núcleo y otros módulos pasa', () => {
    const texto = [
      "import { a } from '../../../entities/fases/a'",
      "import { flujo } from '../../../entities/flujo'",
      "import { z } from 'zod'",
      "// import { x } from '../../../entities/reglas/x'",
    ].join('\n')
    expect(problemasDeAreasDeFlujos(con(f('features/fases/hooks/x.ts', texto)))).toEqual([])
  })

  it('el núcleo que importa un área cae', () => {
    const p = problemasDeAreasDeFlujos(
      con(f('entities/flujo.ts', "import { a } from './fases/a'\nexport const flujo = a\n")),
    )
    expect(p).toEqual([expect.stringContaining('el núcleo importa «./fases/a», de el área fases')])
  })

  it('importar la raíz desde adentro cae', () => {
    const p = problemasDeAreasDeFlujos(con(f('features/fases/x.ts', "import { a } from '../..'\n")))
    expect(p).toEqual([expect.stringContaining('de la raíz')])
  })

  it('una entrada de la raíz con algo que no es export * cae', () => {
    const p = problemasDeAreasDeFlujos(con(f('index.ts', "export { a } from './composicion'\n")))
    expect(p).toEqual([expect.stringContaining('index.ts: sólo lleva')])
  })

  it('falta una entrada de un área, su pantalla, su lugar o el server-only', () => {
    expect(problemasDeAreasDeFlujos(sin('areas/mover/client.ts'))).toEqual([
      expect.stringContaining('areas/mover/client.ts: falta'),
    ])
    expect(problemasDeAreasDeFlujos(sin('pantallas/revisar.ts'))).toEqual([
      expect.stringContaining('pantallas/revisar.ts: falta'),
    ])
    expect(problemasDeAreasDeFlujos(sin('infra/reglas/.gitkeep'))).toEqual([
      expect.stringContaining('infra/reglas/: falta el lugar'),
    ])
    expect(problemasDeAreasDeFlujos(con(f('areas/reglas/composicion.ts', 'export {}\n')))).toEqual([
      expect.stringContaining('server-only'),
    ])
  })

  it('una carpeta sin dueño cae', () => {
    expect(problemasDeAreasDeFlujos(con(f('features/nueva/x.ts', 'export {}\n')))).toEqual([
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

describe('áreas de flujos › el módulo de verdad', () => {
  it('cumple la partición', () => {
    const archivos = [...archivosDe(join(process.cwd(), MODULO))].map((ruta) => ({
      ruta,
      texto: /\.tsx?$/.test(ruta) ? readFileSync(join(process.cwd(), ruta), 'utf8') : '',
    }))
    expect(problemasDeAreasDeFlujos(archivos)).toEqual([])
  })
})
