import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

import { AREAS_DE_WEB, ENTRADAS, MODULO, problemasDeAreasDeWeb, type Archivo } from './areas-de-web'

// La partición de `web` por área (8.01-2): un área no importa otra, el núcleo no importa ningún área, las entradas de la raíz sólo
// reexportan y cada área tiene sus lugares. Si cae: lo nuevo de un paso va en las carpetas de SU área; lo compartido, al núcleo.
const TODAS = ['nucleo', ...AREAS_DE_WEB]
const f = (rel: string, texto = ''): Archivo => ({ ruta: `${MODULO}${rel}`, texto })

function arbol(): Archivo[] {
  const a: Archivo[] = ENTRADAS.map((e) =>
    f(`${e}.ts`, TODAS.map((x) => `export * from './areas/${x}/${e}'`).join('\n')),
  )
  for (const x of TODAS) {
    a.push(f(`areas/${x}/index.ts`), f(`areas/${x}/client.ts`))
    a.push(f(`areas/${x}/composicion.ts`, "// La composición.\nimport 'server-only'\n"))
  }
  for (const x of AREAS_DE_WEB) {
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

describe('áreas de web', () => {
  it('el árbol de prueba cumple', () => {
    expect(problemasDeAreasDeWeb(arbol())).toEqual([])
  })

  it.each([
    ["import { f } from '../../../entities/cola/f'"],
    ["import type { F } from '@/modules/web/entities/cola/f'"],
    ["export { f } from '../../../areas/cola/index'"],
    ["const F = diferido(() => import('../../../features/cola/components/f'))"],
  ])('un área que importa otra cae: %s', (linea) => {
    expect(problemasDeAreasDeWeb(con(f('features/contenido/hooks/x.ts', `${linea}\n`)))).toEqual([
      expect.stringMatching(/el área contenido importa .*de el área cola/),
    ])
  })

  it('un área que importa lo suyo, el núcleo y otros módulos pasa', () => {
    const texto = [
      "import { a } from '../../../entities/contenido/a'",
      "import { unidad } from '../../../entities/nucleo/unidad'",
      "import { z } from 'zod'",
      "// import { x } from '../../../entities/cola/x'",
    ].join('\n')
    expect(problemasDeAreasDeWeb(con(f('features/contenido/hooks/x.ts', texto)))).toEqual([])
  })

  it('el núcleo que importa un área cae', () => {
    const p = problemasDeAreasDeWeb(
      con(
        f(
          'entities/nucleo/unidad.ts',
          "import { a } from '../contenido/a'\nexport const unidad = a\n",
        ),
      ),
    )
    expect(p).toEqual([
      expect.stringContaining('el núcleo importa «../contenido/a», de el área contenido'),
    ])
  })

  it('importar la raíz desde adentro cae', () => {
    const p = problemasDeAreasDeWeb(
      con(f('features/contenido/x.ts', "import { a } from '../..'\n")),
    )
    expect(p).toEqual([expect.stringContaining('de la raíz')])
  })

  it('una entrada de la raíz con algo que no es export * cae', () => {
    const p = problemasDeAreasDeWeb(con(f('index.ts', "export { a } from './composicion'\n")))
    expect(p).toEqual([expect.stringContaining('index.ts: sólo lleva')])
  })

  it('falta una entrada de un área, su pantalla, su lugar o el server-only', () => {
    expect(problemasDeAreasDeWeb(sin('areas/sitio/client.ts'))).toEqual([
      expect.stringContaining('areas/sitio/client.ts: falta'),
    ])
    expect(problemasDeAreasDeWeb(sin('pantallas/portal.ts'))).toEqual([
      expect.stringContaining('pantallas/portal.ts: falta'),
    ])
    expect(problemasDeAreasDeWeb(sin('infra/cola/.gitkeep'))).toEqual([
      expect.stringContaining('infra/cola/: falta el lugar'),
    ])
    expect(problemasDeAreasDeWeb(con(f('areas/cola/composicion.ts', 'export {}\n')))).toEqual([
      expect.stringContaining('server-only'),
    ])
  })

  it('una pantalla nombrada en PANTALLAS_DE_AREA es de esa área', () => {
    const deTurnos = "export { E } from '../features/turnos/rueda/components/e'\n"
    const deSitio = "export { E } from '../features/sitio/components/e'\n"
    expect(problemasDeAreasDeWeb(con(f('pantallas/perfil.ts', deTurnos)))).toEqual([])
    expect(problemasDeAreasDeWeb(con(f('pantallas/perfil.ts', deSitio)))).toEqual([
      expect.stringMatching(/pantallas\/perfil\.ts: el área turnos importa .*de el área sitio/),
    ])
    const deContenido = "export { G } from '../features/contenido/components/g'\n"
    expect(problemasDeAreasDeWeb(con(f('pantallas/sitio-guias.ts', deContenido)))).toEqual([])
    expect(problemasDeAreasDeWeb(con(f('pantallas/sitio-legales.ts', deContenido)))).toEqual([])
    expect(problemasDeAreasDeWeb(con(f('pantallas/sitio-ajustes.ts', deContenido)))).toEqual([
      expect.stringContaining('el área sitio importa'),
    ])
  })

  it('una carpeta sin dueño cae', () => {
    expect(problemasDeAreasDeWeb(con(f('features/nueva/x.ts', 'export {}\n')))).toEqual([
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

describe('áreas de web › el módulo de verdad', () => {
  it('cumple la partición', () => {
    const archivos = [...archivosDe(join(process.cwd(), MODULO))].map((ruta) => ({
      ruta,
      texto: /\.tsx?$/.test(ruta) ? readFileSync(join(process.cwd(), ruta), 'utf8') : '',
    }))
    expect(problemasDeAreasDeWeb(archivos)).toEqual([])
  })
})
