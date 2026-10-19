import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { clientesAlcanzados, esDeCliente, importacionesDe, resolver } from './barriles'

// Una pantalla paga en JS todo lo que reexporta lo que importa (`barriles.ts`): el `index.ts` de un módulo, que importa casi toda pantalla,
// no alcanza ningún componente de cliente. Lo de una pantalla sale por `pantallas/<pantalla>.ts`, que sólo importa `src/app`.

const archivos = (fuentes: Record<string, string>) => (ruta: string) => fuentes[ruta]

describe('barriles: qué es un módulo de cliente', () => {
  it('lo es con la directiva primero, también tras comentarios y líneas en blanco', () => {
    expect(esDeCliente(`'use client'\nexport const a = 1`)).toBe(true)
    expect(esDeCliente(`// un comentario\n\n/* otro */\n"use client"\n`)).toBe(true)
  })

  it('no lo es si la directiva no es lo primero o no está', () => {
    expect(esDeCliente(`import x from 'y'\n'use client'`)).toBe(false)
    expect(esDeCliente(`export const a = 'use client'`)).toBe(false)
    expect(esDeCliente(`// 'use client'\nexport const a = 1`)).toBe(false)
  })
})

describe('barriles: lo que un archivo importa al ejecutarse', () => {
  it('toma imports y reexports de valores, de una o de varias líneas, y los de efecto', () => {
    const texto = [
      `import { a } from './a'`,
      `import b, { c } from '../b'`,
      `export { d } from './d'`,
      `export * from './e'`,
      `export {`,
      `  f,`,
      `  g,`,
      `} from './fg'`,
      `import './efecto'`,
    ].join('\n')
    expect(importacionesDe(texto)).toEqual(['./a', '../b', './d', './e', './fg', './efecto'])
  })

  it('deja los de sólo tipos, que se borran al compilar, y los dinámicos', () => {
    const texto = [
      `import type { A } from './a'`,
      `import { type B, type C } from './bc'`,
      `export type { D } from './d'`,
      `export type * from './e'`,
      `const f = () => import('./f')`,
      `// import { x } from './comentario'`,
      ` * import { y } from './bloque'`,
    ].join('\n')
    expect(importacionesDe(texto)).toEqual([])
  })

  it('un import con un valor y un tipo cuenta', () => {
    expect(importacionesDe(`import { type A, b } from './ab'`)).toEqual(['./ab'])
  })
})

describe('barriles: dónde queda un especificador', () => {
  const leer = archivos({
    'src/modules/x/a.ts': '',
    'src/modules/x/carpeta/index.ts': '',
    'src/modules/x/y.tsx': '',
    'src/shared/lib/z.ts': '',
  })

  it('resuelve relativos, el alias @/ y las carpetas con index', () => {
    expect(resolver('src/modules/x/index.ts', './a', leer)).toBe('src/modules/x/a.ts')
    expect(resolver('src/modules/x/a.ts', './carpeta', leer)).toBe('src/modules/x/carpeta/index.ts')
    expect(resolver('src/modules/x/carpeta/index.ts', '../y', leer)).toBe('src/modules/x/y.tsx')
    expect(resolver('src/modules/x/a.ts', '@/shared/lib/z', leer)).toBe('src/shared/lib/z.ts')
  })

  it('lo que no es nuestro no tiene archivo', () => {
    expect(resolver('src/modules/x/a.ts', 'server-only', leer)).toBeUndefined()
    expect(resolver('src/modules/x/a.ts', 'zod', leer)).toBeUndefined()
    expect(resolver('src/modules/x/a.ts', './no-existe', leer)).toBeUndefined()
  })
})

describe('barriles: los módulos de cliente que alcanza una entrada', () => {
  it('encuentra uno a varios saltos y dice el camino', () => {
    const leer = archivos({
      'src/modules/x/index.ts': `export { leer } from './composicion'`,
      'src/modules/x/composicion.ts': `import { Boton } from './features/boton'\nexport const leer = 1`,
      'src/modules/x/features/boton.tsx': `'use client'\nimport { Interno } from './interno'\nexport const Boton = 1`,
      'src/modules/x/features/interno.tsx': `'use client'\nexport const Interno = 1`,
    })
    expect(clientesAlcanzados('src/modules/x/index.ts', leer)).toEqual([
      {
        archivo: 'src/modules/x/features/boton.tsx',
        camino: [
          'src/modules/x/index.ts',
          'src/modules/x/composicion.ts',
          'src/modules/x/features/boton.tsx',
        ],
      },
    ])
  })

  it('un módulo de cliente corta el recorrido: lo que él importa es asunto del cliente', () => {
    const leer = archivos({
      'src/modules/x/index.ts': `export { Boton } from './boton'`,
      'src/modules/x/boton.tsx': `'use client'\nimport { Otro } from './otro'`,
      'src/modules/x/otro.tsx': `'use client'`,
    })
    expect(clientesAlcanzados('src/modules/x/index.ts', leer).map((c) => c.archivo)).toEqual([
      'src/modules/x/boton.tsx',
    ])
  })

  it('un index sin componentes de cliente, aunque haya ciclos, no alcanza ninguno', () => {
    const leer = archivos({
      'src/modules/x/index.ts': `export { a } from './a'\nexport type { T } from './boton'`,
      'src/modules/x/a.ts': `import { b } from './b'\nexport const a = b`,
      'src/modules/x/b.ts': `import { a } from './a'\nexport const b = a`,
      'src/modules/x/boton.tsx': `'use client'\nexport type T = 1`,
    })
    expect(clientesAlcanzados('src/modules/x/index.ts', leer)).toEqual([])
  })
})

const MODULOS = readdirSync('src/modules', { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(`src/modules/${e.name}/index.ts`))
  .map((e) => e.name)
  .sort()

const leerDelRepo = (ruta: string) => (existsSync(ruta) ? readFileSync(ruta, 'utf8') : undefined)

describe('barriles: el repo', () => {
  it('hay módulos con index.ts que revisar', () => {
    expect(MODULOS.length).toBeGreaterThanOrEqual(5)
  })

  it.each(MODULOS)('el index.ts de %s no alcanza ningún componente de cliente', (modulo) => {
    const alcanzados = clientesAlcanzados(`src/modules/${modulo}/index.ts`, leerDelRepo)
    expect(
      alcanzados.map((c) => c.camino.join(' → ')),
      `El index.ts de ${modulo} alcanza módulos 'use client': todo el que lo importe (casi toda pantalla) los paga en JS. Los componentes de una pantalla salen por pantallas/<pantalla>.ts (sólo src/app).`,
    ).toEqual([])
  })
})
