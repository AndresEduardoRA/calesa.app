import { describe, expect, it } from 'vitest'

import {
  AREAS_DE_COTIZACIONES,
  ENTRADAS,
  MODULO,
  problemasDeAreas,
  type Archivo,
} from './areas-de-cotizaciones'
import { archivosDelModulo } from './areas-de-cotizaciones-arbol'

// La partición de `cotizaciones` por área (4.15-4, `docs/DECISIONES.md`, paso 4.15-4): un área no importa otra, el núcleo no importa
// ningún área, las entradas de la raíz sólo reexportan, y cada área tiene sus lugares.
// Si cae: lo nuevo de un paso va en las carpetas de SU área y en `areas/<su área>/`; lo que dos áreas comparten va al núcleo.

const TODAS = ['nucleo', ...AREAS_DE_COTIZACIONES]
const enModulo = (rel: string, texto = ''): Archivo => ({ ruta: `${MODULO}${rel}`, texto })

// Un módulo que cumple: las entradas de la raíz, las de cada área, los lugares vacíos y un poco de núcleo.
function arbolValido(): Archivo[] {
  const archivos: Archivo[] = ENTRADAS.map((e) =>
    enModulo(
      `${e}.ts`,
      `// La entrada ${e}.\n${TODAS.map((a) => `export * from './areas/${a}/${e}'`).join('\n')}\n`,
    ),
  )
  for (const area of TODAS) {
    archivos.push(
      enModulo(`areas/${area}/index.ts`, 'export {}\n'),
      enModulo(`areas/${area}/client.ts`, 'export {}\n'),
      enModulo(
        `areas/${area}/composicion.ts`,
        "// La composición.\nimport 'server-only'\nexport {}\n",
      ),
    )
  }
  for (const area of AREAS_DE_COTIZACIONES) {
    archivos.push(
      enModulo(`features/${area}/.gitkeep`),
      enModulo(`entities/${area}/.gitkeep`),
      enModulo(`infra/${area}/.gitkeep`),
      enModulo(`pantallas/${area}.ts`, 'export {}\n'),
    )
  }
  archivos.push(
    enModulo('entities/hoja.ts', 'export const hoja = 1\n'),
    enModulo(
      'features/hoja/components/hoja.tsx',
      "import { hoja } from '../../../entities/hoja'\nexport const H = hoja\n",
    ),
    enModulo('pantallas/cotizar.ts', "export { H } from '../features/hoja/components/hoja'\n"),
  )
  return archivos
}

const con = (...extra: Archivo[]) => {
  const rutas = new Set(extra.map((a) => a.ruta))
  return [...arbolValido().filter((a) => !rutas.has(a.ruta)), ...extra]
}
const sin = (rel: string) => arbolValido().filter((a) => a.ruta !== `${MODULO}${rel}`)

describe('áreas de cotizaciones › la dirección de los imports', () => {
  it('el árbol de prueba cumple', () => {
    expect(problemasDeAreas(arbolValido())).toEqual([])
  })

  it.each([
    ["import { f } from '../../../entities/formula/f'"],
    ["import type { F } from '../../../entities/formula/f'"],
    ["export { f } from '../../../entities/formula/f'"],
    ["import '../../../entities/formula/f'"],
    ["const F = diferido(() => import('../../../features/formula/components/f'))"],
    ["import { f } from '@/modules/cotizaciones/entities/formula/f'"],
    ["import {\n  f,\n  g,\n} from '../../../areas/formula/index'"],
  ])('T1/T5 un área que importa otra cae: %s', (linea) => {
    const problemas = problemasDeAreas(con(enModulo('features/listado/hooks/x.ts', `${linea}\n`)))
    expect(problemas).toEqual([
      expect.stringMatching(/el área listado importa .*de el área formula/),
    ])
  })

  it('T1 también en un test de un área', () => {
    const problemas = problemasDeAreas(
      con(enModulo('entities/listado/x.test.ts', "import { f } from '../formula/f'\n")),
    )
    expect(problemas).toEqual([expect.stringContaining('un área no importa otra')])
  })

  it('T2 un área que importa lo suyo y el núcleo pasa', () => {
    const texto = [
      "import { hoja } from '../../../entities/hoja'",
      "import { H } from '@/modules/cotizaciones/features/hoja/components/hoja'",
      "import { l } from '../../../entities/listado/l'",
      "import { z } from 'zod'",
      "import { Boton } from '@/shared/ui/boton'",
      "import { leerSesion } from '@/modules/equipo'",
      "// import { f } from '../../../entities/formula/f'",
    ].join('\n')
    expect(problemasDeAreas(con(enModulo('features/listado/hooks/x.ts', texto)))).toEqual([])
  })

  it('T2 `./diseno` es el archivo del núcleo entities/diseno.ts aunque exista la carpeta del área entities/diseno/', () => {
    const archivos = con(
      enModulo('entities/diseno.ts', 'export const d = 1\n'),
      enModulo('entities/hoja.ts', "import { d } from './diseno'\nexport const hoja = d\n"),
    )
    expect(problemasDeAreas(archivos)).toEqual([])
    expect(
      problemasDeAreas(
        sin('entities/diseno.ts').concat(archivos.filter((a) => a.ruta.endsWith('hoja.ts'))),
      ),
    ).toEqual([
      expect.stringContaining('entities/hoja.ts: el núcleo importa «./diseno», de el área diseno'),
    ])
  })
})

describe('áreas de cotizaciones › el núcleo y las entradas de la raíz', () => {
  it('T3 el núcleo que importa un área cae', () => {
    const problemas = problemasDeAreas(
      con(enModulo('entities/hoja.ts', "import { l } from './listado/l'\nexport const hoja = l\n")),
    )
    expect(problemas).toEqual([
      expect.stringContaining(
        'entities/hoja.ts: el núcleo importa «./listado/l», de el área listado',
      ),
    ])
  })

  it('T3 una pantalla del núcleo que reexporta un área cae', () => {
    const problemas = problemasDeAreas(
      con(
        enModulo('pantallas/cotizar.ts', "export { L } from '../features/listado/components/l'\n"),
      ),
    )
    expect(problemas).toEqual([expect.stringContaining('pantallas/cotizar.ts: el núcleo importa')])
  })

  it.each([
    "'../../../composicion'",
    "'../../../index'",
    "'../../../client'",
    "'@/modules/cotizaciones'",
    "'../../..'",
  ])('T4 importar la entrada de la raíz %s desde adentro cae', (ruta) => {
    const problemas = problemasDeAreas(
      con(enModulo('features/hoja/actions/a.ts', `import { x } from ${ruta}\n`)),
    )
    expect(problemas).toEqual([
      expect.stringContaining('de la raíz: adentro se importa el área o el núcleo'),
    ])
  })

  it('T4 desde un test de la raíz pasa, y la composición del navegador de la raíz no es una entrada', () => {
    const archivos = con(
      enModulo('index.test.ts', "import { x } from './index'\n"),
      enModulo('features/hoja/hooks/h.ts', "import { leer } from '../../../composicion.client'\n"),
    )
    expect(problemasDeAreas(archivos)).toEqual([])
  })
})

describe('áreas de cotizaciones › las entradas', () => {
  it.each(ENTRADAS)('T6 %s.ts de la raíz con algo más que export * cae', (entrada) => {
    const texto = `${TODAS.map((a) => `export * from './areas/${a}/${entrada}'`).join('\n')}\nexport { idsDe } from './entities/listado/filas'\n`
    expect(problemasDeAreas(con(enModulo(`${entrada}.ts`, texto)))).toEqual([
      expect.stringContaining(`${entrada}.ts: sólo lleva comentarios`),
    ])
  })

  it('T6 con un área de menos, repetida o fuera de orden cae', () => {
    const lineas = TODAS.map((a) => `export * from './areas/${a}/index'`)
    for (const texto of [
      lineas.slice(1),
      [...lineas, lineas[1]],
      [lineas[1], lineas[0], ...lineas.slice(2)],
    ]) {
      expect(problemasDeAreas(con(enModulo('index.ts', texto.join('\n'))))).toEqual([
        expect.stringContaining('index.ts: sólo lleva comentarios'),
      ])
    }
  })

  it('T7 una subcarpeta que no es área ni núcleo conocido cae', () => {
    expect(problemasDeAreas(con(enModulo('features/pdf/x.ts', 'export {}\n')))).toEqual([
      expect.stringContaining('features/pdf/: carpeta que no es de ningún área'),
    ])
    expect(problemasDeAreas(con(enModulo('entities/compilacion/.gitkeep')))).toEqual([
      expect.stringContaining('entities/compilacion/: carpeta que no es de ningún área'),
    ])
  })

  it.each([
    ['features/tarjeta/.gitkeep', 'features/tarjeta/: falta el lugar'],
    ['entities/final/.gitkeep', 'entities/final/: falta el lugar'],
    ['infra/tablas/.gitkeep', 'infra/tablas/: falta el lugar'],
    ['pantallas/papelera.ts', 'pantallas/papelera.ts: falta la pantalla'],
    ['areas/diseno/client.ts', 'areas/diseno/client.ts: falta la entrada client'],
    [
      'areas/nucleo/composicion.ts',
      'areas/nucleo/composicion.ts: falta la entrada composicion de el núcleo',
    ],
  ])('T8 sin %s cae', (rel, mensaje) => {
    expect(problemasDeAreas(sin(rel))).toEqual([expect.stringContaining(mensaje)])
  })

  it('T9 una composición de área sin server-only cae', () => {
    expect(problemasDeAreas(con(enModulo('areas/formula/composicion.ts', 'export {}\n')))).toEqual([
      expect.stringContaining(
        "areas/formula/composicion.ts: una composición empieza con `import 'server-only'`",
      ),
    ])
  })

  it('una segunda pantalla de un área es del área', () => {
    const archivos = con(
      enModulo(
        'pantallas/listado-ficha.ts',
        "export { L } from '../features/listado/components/l'\n",
      ),
    )
    expect(problemasDeAreas(archivos)).toEqual([])
  })
})

describe('áreas de cotizaciones › el árbol real', () => {
  it('T11 src/modules/cotizaciones/ cumple la partición por áreas', () => {
    expect(problemasDeAreas(archivosDelModulo())).toEqual([])
  })
})
